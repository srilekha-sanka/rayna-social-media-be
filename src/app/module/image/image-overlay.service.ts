import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { UPLOAD_DIR } from '../../config/upload.config'
import { cloudinaryService } from '../cloudinary/cloudinary.service'
import { logger } from '../../common/logger/logging'
import { env } from '../../../db/config/env.config'

// ── Types ────────────────────────────────────────────────────────────

export type AspectRatio = '1:1' | '4:5' | '1.91:1' | 'auto'
export type TemplateName = 'gradient-cta' | 'minimal-text' | 'full-bleed' | 'poster' | 'heritage-poster' | 'adventure-poster' | 'explorer-poster' | 'lifestyle-poster'
export type PosterLayout = 'brush-script' | 'heritage' | 'bold-adventure' | 'explorer' | 'lifestyle'

export interface PosterConfig {
	brand_name: string
	headline: string
	subheadline?: string
	tagline?: string
	price?: string
	includes?: string
	dates?: string
	duration?: string
	contact?: string
	layout?: PosterLayout
}

export interface OverlayConfig {
	template: TemplateName
	aspectRatio?: AspectRatio
	title?: string
	subtitle?: string
	ctaText?: string
	accentColor?: string
	poster?: PosterConfig
}

export interface ProcessedImage {
	buffer: Buffer
	width: number
	height: number
	aspectRatio: AspectRatio
}

interface CanvasDimensions {
	width: number
	height: number
	ratio: AspectRatio
}

// ── Constants ────────────────────────────────────────────────────────

const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed')

// Montserrat is the Rayna Tours brand font. Fallback to system heavy sans-serif.
const FONT_TITLE = 'Montserrat, Arial Black, Helvetica, sans-serif'
const FONT_BODY = 'Montserrat, Arial, Helvetica Neue, sans-serif'

const INSTAGRAM_DIMENSIONS: Record<Exclude<AspectRatio, 'auto'>, { width: number; height: number }> = {
	'1:1': { width: 1080, height: 1080 },
	'4:5': { width: 1080, height: 1350 },
	'1.91:1': { width: 1080, height: 566 },
}

const ensureDir = (dir: string) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
ensureDir(PROCESSED_DIR)

// ── Service ──────────────────────────────────────────────────────────

class ImageOverlayService {

	private logoCache: Buffer | null = null

	// ── Brand Logo ──────────────────────────────────────────────────

	private async getLogoBuffer(): Promise<Buffer | null> {
		if (this.logoCache) return this.logoCache

		// Try local file first
		const localPath = path.join(__dirname, '../../../../assets/rayna-logo.png')
		if (fs.existsSync(localPath)) {
			this.logoCache = fs.readFileSync(localPath)
			return this.logoCache
		}

		// Try downloading from BRAND_LOGO_URL
		const logoUrl = env.brand.logoUrl
		if (!logoUrl) return null

		try {
			const buf = await this.downloadToBuffer(logoUrl)
			this.logoCache = buf
			return this.logoCache
		} catch (err: any) {
			logger.error(`Failed to download brand logo: ${err.message}`)
			return null
		}
	}

	private async compositeLogoOnImage(
		imageBuffer: Buffer,
		position: { top: number; left: number; width: number; height: number }
	): Promise<Buffer> {
		const logo = await this.getLogoBuffer()
		if (!logo) return imageBuffer

		const resizedLogo = await sharp(logo)
			.resize(position.width, position.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toBuffer()

		return sharp(imageBuffer)
			.composite([{ input: resizedLogo, top: position.top, left: position.left }])
			.toBuffer()
	}

	// ── Public API ───────────────────────────────────────────────────

	async processImage(imagePath: string, config: OverlayConfig): Promise<ProcessedImage> {
		const metadata = await sharp(imagePath).metadata()
		const srcW = metadata.width || 1080
		const srcH = metadata.height || 1080
		const srcRatio = srcW / srcH

		const target: CanvasDimensions = { ...INSTAGRAM_DIMENSIONS['4:5'], ratio: '4:5' }
		if (config.aspectRatio && config.aspectRatio !== 'auto') {
			const dims = INSTAGRAM_DIMENSIONS[config.aspectRatio]
			target.width = dims.width
			target.height = dims.height
			target.ratio = config.aspectRatio
		}

		let baseBuffer: Buffer

		if (srcRatio > 1.2) {
			// Landscape → use Cloudinary Generative Fill to extend to portrait
			baseBuffer = await this.extendLandscapeToPortrait(imagePath, target)
		} else {
			// Portrait/square → crop to fill
			baseBuffer = await sharp(imagePath)
				.resize(target.width, target.height, { fit: 'cover', position: 'attention' })
				.toBuffer()
		}

		// Apply text overlay on the extended/resized image
		const svgOverlay = this.buildOverlaySvg(target.width, target.height, config)
		const outputBuffer = await sharp(baseBuffer)
			.composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
			.jpeg({ quality: 92 })
			.toBuffer()

		return { buffer: outputBuffer, width: target.width, height: target.height, aspectRatio: target.ratio }
	}

	async processImageToFile(imagePath: string, config: OverlayConfig): Promise<string> {
		const result = await this.processImage(imagePath, config)
		const outputFileName = `pro-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpeg`
		const outputPath = path.join(PROCESSED_DIR, outputFileName)
		fs.writeFileSync(outputPath, result.buffer)
		return outputPath
	}

	// ── Landscape → Portrait via Cloudinary Generative Fill ─────────
	//
	//    Cloudinary AI extends the scene naturally:
	//    - Sky continues upward
	//    - Ground/water continues downward
	//    - No crop, no blur, no distortion
	//    - The original image is fully preserved
	//
	//    Falls back to sharp cover-crop if Cloudinary is unavailable.

	private async extendLandscapeToPortrait(imagePath: string, target: CanvasDimensions): Promise<Buffer> {
		if (cloudinaryService.enabled) {
			try {
				const result = await cloudinaryService.generativeFill(imagePath, {
					folder: 'rayna/carousel',
					aspectRatio: `${target.width}:${target.height}`,
					width: target.width,
					height: target.height,
				})

				// Download the gen_fill result back as a buffer
				const genFillUrl = cloudinaryService.getEagerUrl(result)
				logger.info(`Cloudinary gen_fill applied: ${genFillUrl}`)
				return this.downloadToBuffer(genFillUrl)
			} catch (err: any) {
				logger.error(`Cloudinary gen_fill failed, falling back to cover crop: ${err.message}`)
			}
		}

		// Fallback: simple cover crop
		return sharp(imagePath)
			.resize(target.width, target.height, { fit: 'cover', position: 'attention' })
			.toBuffer()
	}

	private downloadToBuffer(url: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const client = url.startsWith('https') ? https : http
			client.get(url, (res) => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					return resolve(this.downloadToBuffer(res.headers.location))
				}
				const chunks: Buffer[] = []
				res.on('data', (chunk) => chunks.push(chunk))
				res.on('end', () => resolve(Buffer.concat(chunks)))
				res.on('error', reject)
			}).on('error', reject)
		})
	}

	// ── SVG Router ──────────────────────────────────────────────────

	private buildOverlaySvg(w: number, h: number, config: OverlayConfig): string {
		switch (config.template) {
			case 'gradient-cta': return this.svgGradientCta(w, h, config)
			case 'minimal-text': return this.svgMinimalText(w, h, config)
			case 'poster': return this.svgPoster(w, h, config)
			case 'heritage-poster': return this.svgHeritagePoster(w, h, config)
			case 'adventure-poster': return this.svgAdventurePoster(w, h, config)
			case 'explorer-poster': return this.svgExplorerPoster(w, h, config)
			case 'lifestyle-poster': return this.svgLifestylePoster(w, h, config)
			case 'full-bleed': return this.svgEmpty(w, h)
			default: return this.svgGradientCta(w, h, config)
		}
	}

	// ── Template: gradient-cta ──────────────────────────────────────
	//
	//    Layout (bottom-up, matches raynatours_ Instagram style):
	//
	//    ┌─────────────────────┐
	//    │                     │
	//    │    (full image)     │
	//    │                     │
	//    │  ▓▓▓ gradient ▓▓▓  │
	//    │  Title Line 1       │
	//    │  Title Line 2       │
	//    │  ┌──────────┐       │
	//    │  │ BOOK NOW  │      │
	//    │  └──────────┘       │
	//    │  Subtitle text      │
	//    └─────────────────────┘

	private svgGradientCta(w: number, h: number, config: OverlayConfig): string {
		const pad = Math.round(w * 0.07)
		const maxTextW = w - pad * 2
		const accent = config.accentColor || '#F97316'
		const els: string[] = []

		// Font sizing
		const titleSize = Math.round(h * 0.05)
		const titleLH = Math.round(titleSize * 1.15)
		const subtitleSize = Math.round(h * 0.023)
		const subtitleLH = Math.round(subtitleSize * 1.45)
		const ctaFontSize = Math.round(h * 0.019)
		const ctaH = Math.round(h * 0.04)
		const ctaRadius = Math.round(ctaH * 0.18)
		const gap = Math.round(h * 0.016)

		const titleLines = config.title ? this.wrapText(config.title, maxTextW, titleSize, true) : []
		const subtitleLines = config.subtitle ? this.wrapText(config.subtitle, maxTextW, subtitleSize, false) : []

		// Bottom-up layout
		let cursor = h - pad

		// Subtitle
		let subtitleStartY = 0
		if (subtitleLines.length > 0) {
			cursor -= subtitleLines.length * subtitleLH
			subtitleStartY = cursor + subtitleSize
			cursor -= gap
		}

		// CTA
		let ctaY = 0
		if (config.ctaText) {
			cursor -= ctaH
			ctaY = cursor
			cursor -= gap
		}

		// Title
		let titleStartY = 0
		if (titleLines.length > 0) {
			cursor -= (titleLines.length - 1) * titleLH + titleSize
			titleStartY = cursor + titleSize
			cursor -= gap
		}

		// Gradient
		const gradientTop = Math.max(0, Math.round(cursor - h * 0.15))
		const gy = (gradientTop / h).toFixed(3)
		els.push(
			`<defs><linearGradient id="g" x1="0" y1="${gy}" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="30%" stop-color="#000000" stop-opacity="0.3"/>` +
			`<stop offset="60%" stop-color="#000000" stop-opacity="0.65"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.9"/>` +
			`</linearGradient></defs>`
		)
		els.push(`<rect x="0" y="${gradientTop}" width="${w}" height="${h - gradientTop}" fill="url(#g)"/>`)

		// Title
		if (titleLines.length > 0) {
			const tspans = titleLines.map((line, i) =>
				`<tspan x="${pad}" dy="${i === 0 ? '0' : titleLH}">${this.esc(line)}</tspan>`
			).join('')
			els.push(
				`<text x="${pad}" y="${titleStartY}"` +
				` font-family="${FONT_TITLE}"` +
				` font-size="${titleSize}"` +
				` font-weight="800"` +
				` fill="#FFFFFF"` +
				` letter-spacing="0.5"` +
				`>${tspans}</text>`
			)
		}

		// CTA button (solid orange fill, rounded, no border)
		if (config.ctaText) {
			const label = config.ctaText.toUpperCase()
			const ctaTextW = this.estimateTextWidth(label, ctaFontSize, true)
			const ctaPadX = Math.round(ctaH * 1.1)
			const ctaW = ctaTextW + ctaPadX * 2
			const ctaBtnRadius = Math.round(ctaH * 0.15)

			els.push(`<rect x="${pad}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="${ctaBtnRadius}" ry="${ctaBtnRadius}" fill="${accent}"/>`)
			els.push(
				`<text x="${pad + ctaW / 2}" y="${ctaY + ctaH * 0.66}"` +
				` font-family="${FONT_BODY}"` +
				` font-size="${ctaFontSize}"` +
				` font-weight="700"` +
				` fill="#FFFFFF"` +
				` text-anchor="middle"` +
				` letter-spacing="2"` +
				`>${this.esc(label)}</text>`
			)
		}

		// Subtitle
		if (subtitleLines.length > 0) {
			const tspans = subtitleLines.map((line, i) =>
				`<tspan x="${pad}" dy="${i === 0 ? '0' : subtitleLH}">${this.esc(line)}</tspan>`
			).join('')
			els.push(
				`<text x="${pad}" y="${subtitleStartY}"` +
				` font-family="${FONT_BODY}"` +
				` font-size="${subtitleSize}"` +
				` font-weight="400"` +
				` fill="#FFFFFF"` +
				` fill-opacity="0.9"` +
				` letter-spacing="0.3"` +
				`>${tspans}</text>`
			)
		}

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Template: minimal-text (middle carousel slides) ─────────────

	private svgMinimalText(w: number, h: number, config: OverlayConfig): string {
		const els: string[] = []
		const pad = Math.round(w * 0.08)
		const fontSize = Math.round(h * 0.045)
		const lineHeight = Math.round(fontSize * 1.15)
		const maxTextW = w - pad * 2

		els.push(
			`<defs><linearGradient id="g" x1="0" y1="0.55" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="50%" stop-color="#000000" stop-opacity="0.45"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>` +
			`</linearGradient></defs>`
		)
		els.push(`<rect x="0" y="${Math.round(h * 0.55)}" width="${w}" height="${Math.round(h * 0.45)}" fill="url(#g)"/>`)

		if (config.title) {
			const lines = this.wrapText(config.title, maxTextW, fontSize, true)
			const totalH = lines.length * lineHeight
			const startY = h - pad - totalH + fontSize

			const tspans = lines.map((line, i) =>
				`<tspan x="${w / 2}" dy="${i === 0 ? '0' : lineHeight}" text-anchor="middle">${this.esc(line)}</tspan>`
			).join('')
			els.push(
				`<text x="${w / 2}" y="${startY}"` +
				` font-family="${FONT_TITLE}"` +
				` font-size="${fontSize}"` +
				` font-weight="800"` +
				` fill="#FFFFFF"` +
				` text-anchor="middle"` +
				` letter-spacing="0.5"` +
				`>${tspans}</text>`
			)
		}

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Template: poster (Rayna Tours travel poster — Bali reference style) ──
	//
	//    Layout (top-down, centered, text floats on full-bleed photo):
	//
	//    ┌──────────────────────────┐
	//    │     Rayna Tours          │  ← brand name (small, white, sans-serif)
	//    │                          │
	//    │      Explore             │  ← headline line 1 (large, brush script)
	//    │        Bali              │  ← headline line 2 (large, brush script)
	//    │                          │
	//    │ ▓▓▓▓▓▓▓ gradient ▓▓▓▓▓▓ │  ← subtle dark gradient lower 40%
	//    │     Starting From        │  ← label (small, sans-serif)
	//    │      AED 999/-           │  ← price (large, bold, sans-serif)
	//    │       Includes           │  ← label
	//    │  Stay | Breakfast | ...  │  ← includes line
	//    │                          │
	//    │    15 MAY | 4D-3N        │  ← date/duration
	//    │    +971 XXXXXXXX         │  ← contact
	//    └──────────────────────────┘

	private svgPoster(w: number, h: number, config: OverlayConfig): string {
		const p = config.poster
		if (!p) return this.svgEmpty(w, h)

		const els: string[] = []
		const cx = w / 2 // center x

		// ── Font families ──
		const SCRIPT = 'Great Vibes, Dancing Script, cursive'
		const SANS = 'Montserrat, Arial, Helvetica, sans-serif'

		// ── Font sizes (proportional to canvas height) ──
		const headlineSize = Math.round(h * 0.075)
		const headlineLH = Math.round(headlineSize * 1.1)
		const labelSize = Math.round(h * 0.018)
		const priceSize = Math.round(h * 0.045)
		const includesLabelSize = Math.round(h * 0.018)
		const includesSize = Math.round(h * 0.017)
		const footerSize = Math.round(h * 0.018)
		const contactSize = Math.round(h * 0.015)

		// ── Text shadow filter for readability ──
		els.push(
			`<defs>` +
			`<filter id="ts" x="-5%" y="-5%" width="110%" height="110%">` +
			`<feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>` +
			`</filter>` +
			// Gradient: transparent top → dark bottom (lower 45%)
			`<linearGradient id="pg" x1="0" y1="0.55" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="40%" stop-color="#000000" stop-opacity="0.25"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.7"/>` +
			`</linearGradient>` +
			`</defs>`
		)

		// ── Gradient overlay (lower 45% of image) ──
		const gradTop = Math.round(h * 0.55)
		els.push(`<rect x="0" y="${gradTop}" width="${w}" height="${h - gradTop}" fill="url(#pg)"/>`)

		// ── Slight top vignette for brand name readability ──
		els.push(
			`<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="0.15">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
			`</linearGradient></defs>`
		)
		els.push(`<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.15)}" fill="url(#tg)"/>`)

		// ── 1. Brand logo — composited via sharp (see renderPoster) ──

		// ── 2. Headline — brush script (upper-center) ──
		// Split headline into words, max 2-3 words per line for visual impact
		const headlineWords = p.headline.split(/\s+/)
		const headlineLines: string[] = []
		if (headlineWords.length <= 2) {
			headlineLines.push(headlineWords.join(' '))
		} else {
			// First line: first word (or "Explore"), rest on second line
			const mid = Math.ceil(headlineWords.length / 2)
			headlineLines.push(headlineWords.slice(0, mid).join(' '))
			headlineLines.push(headlineWords.slice(mid).join(' '))
		}

		const headlineStartY = Math.round(h * 0.22)
		headlineLines.forEach((line, i) => {
			els.push(
				`<text x="${cx}" y="${headlineStartY + i * headlineLH}" text-anchor="middle"` +
				` font-family="${SCRIPT}" font-size="${headlineSize}" font-weight="400"` +
				` fill="#FFFFFF" filter="url(#ts)"` +
				`>${this.esc(line)}</text>`
			)
		})

		// ── 3. Starting From + Price (center-lower) ──
		if (p.price) {
			const startingY = Math.round(h * 0.62)
			els.push(
				`<text x="${cx}" y="${startingY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${labelSize}" font-weight="400"` +
				` fill="#FFFFFF" fill-opacity="0.9" letter-spacing="1.5" filter="url(#ts)"` +
				`>Starting From</text>`
			)

			const priceY = startingY + Math.round(priceSize * 1.1)
			els.push(
				`<text x="${cx}" y="${priceY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${priceSize}" font-weight="700"` +
				` fill="#FFFFFF" letter-spacing="1" filter="url(#ts)"` +
				`>${this.esc(p.price)}</text>`
			)

			// ── 4. Includes (below price) ──
			if (p.includes) {
				const includesLabelY = priceY + Math.round(includesLabelSize * 2.5)
				els.push(
					`<text x="${cx}" y="${includesLabelY}" text-anchor="middle"` +
					` font-family="${SANS}" font-size="${includesLabelSize}" font-weight="600"` +
					` fill="#FFFFFF" fill-opacity="0.9" letter-spacing="1" filter="url(#ts)"` +
					`>Includes</text>`
				)

				const includesY = includesLabelY + Math.round(includesSize * 1.8)
				els.push(
					`<text x="${cx}" y="${includesY}" text-anchor="middle"` +
					` font-family="${SANS}" font-size="${includesSize}" font-weight="400"` +
					` fill="#FFFFFF" fill-opacity="0.85" letter-spacing="0.5" filter="url(#ts)"` +
					`>${this.esc(p.includes)}</text>`
				)
			}
		}

		// ── 5. Footer: dates + contact (bottom) ──
		const footerBaseY = Math.round(h * 0.9)
		if (p.dates) {
			els.push(
				`<text x="${cx}" y="${footerBaseY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${footerSize}" font-weight="600"` +
				` fill="#FFFFFF" letter-spacing="2" filter="url(#ts)"` +
				`>${this.esc(p.dates)}</text>`
			)
		}
		if (p.contact) {
			const contactY = footerBaseY + Math.round(contactSize * 1.8)
			els.push(
				`<text x="${cx}" y="${contactY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${contactSize}" font-weight="400"` +
				` fill="#FFFFFF" fill-opacity="0.85" letter-spacing="1" filter="url(#ts)"` +
				`>${this.esc(p.contact)}</text>`
			)
		}

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Template: heritage-poster (Cinematic cultural travel poster) ──
	//
	//    Layout (Bali Heritage reference):
	//
	//    ┌──────────────────────────────┐
	//    │                              │
	//    │         Bali                 │  ← script headline (cream, calligraphic)
	//    │                              │
	//    │    THE BALI EXPERIENCE       │  ← main title (serif, ALL CAPS, cream)
	//    │   HERITAGE • CULTURE • ESC   │  ← subtitle (serif, small, spaced)
	//    │          ───                 │  ← thin divider ornament
	//    │                              │
	//    │ ▓▓▓▓▓▓▓ gradient ▓▓▓▓▓▓▓▓▓ │
	//    │                              │
	//    │ Includes:        3 DAYS | 2N │  ← split bottom: left info, right price
	//    │ Stay | Breakfast  STARTING   │
	//    │ Tours | Transfers  AED 999   │
	//    │                              │
	//    │       RAYNA TOURS            │  ← brand logo text (center bottom)
	//    │        by your side          │  ← tagline
	//    └──────────────────────────────┘

	private svgHeritagePoster(w: number, h: number, config: OverlayConfig): string {
		const p = config.poster
		if (!p) return this.svgEmpty(w, h)

		const els: string[] = []
		const cx = w / 2
		const pad = Math.round(w * 0.07)

		// ── Font families ──
		const SCRIPT = 'Great Vibes, Dancing Script, cursive'
		const SERIF = 'Georgia, Times New Roman, Palatino, serif'
		const SANS = 'Montserrat, Arial, Helvetica, sans-serif'

		// ── Font sizes (tuned for 1080x1350) ──
		const headlineSize = Math.round(h * 0.07)
		const titleSize = Math.round(h * 0.02)
		const subtitleSize = Math.round(h * 0.012)
		const infoLabelSize = Math.round(h * 0.016)
		const infoSize = Math.round(h * 0.015)
		const durationSize = Math.round(h * 0.015)
		const priceLabelSize = Math.round(h * 0.013)
		const priceSize = Math.round(h * 0.032)
		const taglineSize = Math.round(h * 0.011)

		const CREAM = '#F5F0E8'

		// ── Filters and gradients ──
		els.push(
			`<defs>` +
			`<filter id="ts" x="-10%" y="-10%" width="120%" height="120%">` +
			`<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>` +
			`</filter>` +
			// Strong bottom gradient (lower 45%) — readable on ANY background
			`<linearGradient id="pg" x1="0" y1="0.55" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="25%" stop-color="#000000" stop-opacity="0.35"/>` +
			`<stop offset="60%" stop-color="#000000" stop-opacity="0.65"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.85"/>` +
			`</linearGradient>` +
			// Top vignette for headline readability
			`<linearGradient id="tg" x1="0" y1="0" x2="0" y2="0.25">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0.4"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
			`</linearGradient>` +
			`</defs>`
		)

		// Gradient overlays
		els.push(`<rect x="0" y="${Math.round(h * 0.55)}" width="${w}" height="${Math.round(h * 0.45)}" fill="url(#pg)"/>`)
		els.push(`<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.25)}" fill="url(#tg)"/>`)

		// ── 1. Script headline (upper area) ──
		const headlineY = Math.round(h * 0.2)
		els.push(
			`<text x="${cx}" y="${headlineY}" text-anchor="middle"` +
			` font-family="${SCRIPT}" font-size="${headlineSize}" font-weight="400"` +
			` fill="${CREAM}" filter="url(#ts)"` +
			`>${this.esc(p.headline)}</text>`
		)

		// ── 2. Main title — serif, ALL CAPS ──
		// If subheadline is too long or missing, auto-generate "THE {HEADLINE} EXPERIENCE"
		const rawTitle = p.subheadline && p.subheadline.length <= 30
			? p.subheadline
			: `THE ${p.headline.toUpperCase()} EXPERIENCE`
		const titleY = headlineY + Math.round(titleSize * 3)
		els.push(
			`<text x="${cx}" y="${titleY}" text-anchor="middle"` +
			` font-family="${SERIF}" font-size="${titleSize}" font-weight="700"` +
			` fill="${CREAM}" letter-spacing="5" filter="url(#ts)"` +
			`>${this.esc(rawTitle.toUpperCase())}</text>`
		)

		// ── 3. Subtitle — always use bullet-separated keywords ──
		const subtitleY = titleY + Math.round(subtitleSize * 3)
		// Use tagline if it contains bullets/pipes, otherwise generate from headline
		const hasKeywords = p.tagline && (/[•|·]/.test(p.tagline))
		const subtitleText = hasKeywords
			? p.tagline!.toUpperCase()
			: `HERITAGE \u2022 CULTURE \u2022 ESCAPE`
		els.push(
			`<text x="${cx}" y="${subtitleY}" text-anchor="middle"` +
			` font-family="${SERIF}" font-size="${subtitleSize}" font-weight="400"` +
			` fill="${CREAM}" fill-opacity="0.85" letter-spacing="3" filter="url(#ts)"` +
			`>${this.esc(subtitleText)}</text>`
		)

		// ── Thin divider ornament ──
		const divY = subtitleY + Math.round(h * 0.015)
		const divW = Math.round(w * 0.06)
		els.push(`<line x1="${cx - divW}" y1="${divY}" x2="${cx + divW}" y2="${divY}" stroke="${CREAM}" stroke-opacity="0.5" stroke-width="1"/>`)
		const dSize = 3
		els.push(`<polygon points="${cx},${divY - dSize} ${cx + dSize},${divY} ${cx},${divY + dSize} ${cx - dSize},${divY}" fill="${CREAM}" fill-opacity="0.6"/>`)

		// ── 4. Bottom split: Includes (left) | Duration + Price (right) ──
		const bottomY = Math.round(h * 0.76)
		const leftX = pad + Math.round(w * 0.02)
		const rightX = w - pad - Math.round(w * 0.02)

		// Vertical divider line
		els.push(`<line x1="${cx}" y1="${bottomY - Math.round(h * 0.01)}" x2="${cx}" y2="${bottomY + Math.round(h * 0.09)}" stroke="${CREAM}" stroke-opacity="0.35" stroke-width="1"/>`)

		// Left: Includes
		if (p.includes) {
			els.push(
				`<text x="${leftX}" y="${bottomY}" text-anchor="start"` +
				` font-family="${SANS}" font-size="${infoLabelSize}" font-weight="700"` +
				` fill="${CREAM}" letter-spacing="1" filter="url(#ts)"` +
				`>Includes:</text>`
			)

			const items = p.includes.split(' | ')
			const mid = Math.ceil(items.length / 2)
			const line1 = items.slice(0, mid).join(' | ')
			const line2 = items.slice(mid).join(' | ')

			const incLine1Y = bottomY + Math.round(infoSize * 2.2)
			els.push(
				`<text x="${leftX}" y="${incLine1Y}" text-anchor="start"` +
				` font-family="${SANS}" font-size="${infoSize}" font-weight="400"` +
				` fill="${CREAM}" fill-opacity="0.9" filter="url(#ts)"` +
				`>${this.esc(line1)}</text>`
			)
			if (line2) {
				const incLine2Y = incLine1Y + Math.round(infoSize * 2)
				els.push(
					`<text x="${leftX}" y="${incLine2Y}" text-anchor="start"` +
					` font-family="${SANS}" font-size="${infoSize}" font-weight="400"` +
					` fill="${CREAM}" fill-opacity="0.9" filter="url(#ts)"` +
					`>${this.esc(line2)}</text>`
				)
			}
		}

		// Right: Duration + Price
		if (p.duration || p.dates) {
			const durationText = p.dates || p.duration || ''
			els.push(
				`<text x="${rightX}" y="${bottomY}" text-anchor="end"` +
				` font-family="${SANS}" font-size="${durationSize}" font-weight="700"` +
				` fill="${CREAM}" letter-spacing="2" filter="url(#ts)"` +
				`>${this.esc(durationText.toUpperCase())}</text>`
			)
		}

		if (p.price) {
			const priceLabelY = bottomY + Math.round(priceLabelSize * 2.5)
			els.push(
				`<text x="${rightX}" y="${priceLabelY}" text-anchor="end"` +
				` font-family="${SANS}" font-size="${priceLabelSize}" font-weight="500"` +
				` fill="${CREAM}" fill-opacity="0.9" letter-spacing="2" filter="url(#ts)"` +
				`>STARTING FROM</text>`
			)

			const priceY = priceLabelY + Math.round(priceSize * 1.15)
			const priceText = p.price.replace('/-', '')
			els.push(
				`<text x="${rightX}" y="${priceY}" text-anchor="end"` +
				` font-family="${SERIF}" font-size="${priceSize}" font-weight="700"` +
				` fill="${CREAM}" letter-spacing="1" filter="url(#ts)"` +
				`>${this.esc(priceText)}</text>`
			)
		}

		// ── 5. Brand logo — composited via sharp (see renderPoster) ──
		// Tagline below logo area
		const tagY = Math.round(h * 0.96)
		els.push(
			`<text x="${cx}" y="${tagY}" text-anchor="middle"` +
			` font-family="${SERIF}" font-size="${taglineSize}" font-weight="400"` +
			` fill="${CREAM}" fill-opacity="0.7" font-style="italic" letter-spacing="1.5" filter="url(#ts)"` +
			`>by your side</text>`
		)

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Template: adventure-poster (Bold trek/event poster) ──────
	//
	//    Layout (Plus Valley Trek reference):
	//
	//    ┌────────────────────────────┐
	//    │ 🏔 Rayna Tours             │  ← logo top-left (small, white)
	//    │                            │
	//    │      Plus Valley           │  ← script headline (large, white)
	//    │         Trek               │
	//    │                            │
	//    │ ▓▓▓▓▓▓ gradient ▓▓▓▓▓▓▓▓ │
	//    │        Fees-               │  ← label (small, white)
	//    │      FEES 1500/-           │  ← price (large, bold, white)
	//    │                            │
	//    │       Includes             │  ← accent color (yellow/orange)
	//    │ Transport | Meals | Entry  │  ← bold white
	//    │                            │
	//    │ ┌──────┬──────────┬──────┐ │  ← pill boxes at bottom
	//    │ │22 MAR│ +91 XXX  │ +91  │ │
	//    │ └──────┴──────────┴──────┘ │
	//    └────────────────────────────┘

	private svgAdventurePoster(w: number, h: number, config: OverlayConfig): string {
		const p = config.poster
		if (!p) return this.svgEmpty(w, h)

		const els: string[] = []
		const cx = w / 2
		const pad = Math.round(w * 0.06)
		const maxTextW = w - pad * 2

		const SCRIPT = 'Great Vibes, Dancing Script, cursive'
		const SANS = 'Montserrat, Arial, Helvetica, sans-serif'
		const ACCENT = '#F5A623'

		// ── Dynamic headline sizing — must dominate top 35% ──
		let headlineSize = Math.round(h * 0.09) // BIG — like reference
		const headlineLH = Math.round(headlineSize * 1.0)
		const feesLabelSize = Math.round(h * 0.017)
		const priceSize = Math.round(h * 0.035)
		const includesLabelSize = Math.round(h * 0.018)
		const includesSize = Math.round(h * 0.017)
		const pillFontSize = Math.round(h * 0.015)
		const pillH = Math.round(h * 0.038)

		// ── Defs ──
		els.push(
			`<defs>` +
			`<filter id="ts" x="-10%" y="-10%" width="120%" height="120%">` +
			`<feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000000" flood-opacity="0.7"/>` +
			`</filter>` +
			`<linearGradient id="pg" x1="0" y1="0.45" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="25%" stop-color="#000000" stop-opacity="0.3"/>` +
			`<stop offset="55%" stop-color="#000000" stop-opacity="0.6"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.85"/>` +
			`</linearGradient>` +
			`<linearGradient id="tg" x1="0" y1="0" x2="0" y2="0.12">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0.4"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
			`</linearGradient>` +
			`</defs>`
		)

		els.push(`<rect x="0" y="${Math.round(h * 0.45)}" width="${w}" height="${Math.round(h * 0.55)}" fill="url(#pg)"/>`)
		els.push(`<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.12)}" fill="url(#tg)"/>`)

		// ── 1. Brand logo — composited via sharp (see renderPoster) ──

		// ── 2. HUGE script headline — dominates upper area ──
		// Smart wrap: fit lines within canvas width
		const headlineWords = p.headline.split(/\s+/)
		const headlineLines: string[] = []
		let curLine = ''
		for (const word of headlineWords) {
			const test = curLine ? `${curLine} ${word}` : word
			if (this.estimateTextWidth(test, headlineSize, false) > maxTextW * 0.9 && curLine) {
				headlineLines.push(curLine)
				curLine = word
			} else {
				curLine = test
			}
		}
		if (curLine) headlineLines.push(curLine)

		// If still overflows single line, scale down
		for (const line of headlineLines) {
			const lineW = this.estimateTextWidth(line, headlineSize, false)
			if (lineW > maxTextW) {
				headlineSize = Math.round(headlineSize * (maxTextW / lineW) * 0.85)
			}
		}

		const headlineStartY = Math.round(h * 0.14)
		headlineLines.forEach((line, i) => {
			els.push(
				`<text x="${cx}" y="${headlineStartY + i * headlineLH}" text-anchor="middle"` +
				` font-family="${SCRIPT}" font-size="${headlineSize}" font-weight="400"` +
				` fill="#FFFFFF" filter="url(#ts)"` +
				`>${this.esc(line)}</text>`
			)
		})

		// ── Position everything else relative to headline bottom ──
		const afterHeadline = headlineStartY + headlineLines.length * headlineLH

		// ── 3. Fees- label + BOLD price ──
		const feesY = Math.max(afterHeadline + Math.round(h * 0.08), Math.round(h * 0.55))
		els.push(
			`<text x="${cx}" y="${feesY}" text-anchor="middle"` +
			` font-family="${SANS}" font-size="${feesLabelSize}" font-weight="400"` +
			` fill="#FFFFFF" fill-opacity="0.9" letter-spacing="1" filter="url(#ts)"` +
			`>Fees-</text>`
		)

		if (p.price) {
			const priceY = feesY + Math.round(priceSize * 1.2)
			els.push(
				`<text x="${cx}" y="${priceY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${priceSize}" font-weight="800"` +
				` fill="#FFFFFF" letter-spacing="1" filter="url(#ts)"` +
				`>FEES ${this.esc(p.price)}</text>`
			)
		}

		// ── 4. Includes — accent label + bold white items ──
		const incLabelY = Math.round(h * 0.73)
		els.push(
			`<text x="${cx}" y="${incLabelY}" text-anchor="middle"` +
			` font-family="${SANS}" font-size="${includesLabelSize}" font-weight="700"` +
			` fill="${ACCENT}" letter-spacing="2" filter="url(#ts)"` +
			`>Includes</text>`
		)

		if (p.includes) {
			const incY = incLabelY + Math.round(includesSize * 2)
			els.push(
				`<text x="${cx}" y="${incY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${includesSize}" font-weight="700"` +
				` fill="#FFFFFF" letter-spacing="0.5" filter="url(#ts)"` +
				`>${this.esc(p.includes)}</text>`
			)
		}

		// ── 5. Footer pills — date + contacts ──
		const pillY = Math.round(h * 0.87)
		const pillR = Math.round(pillH * 0.15)
		const pillGap = Math.round(w * 0.015)

		const footerItems: string[] = []
		if (p.dates) footerItems.push(p.dates)
		if (p.contact) footerItems.push(...p.contact.split(/\s*[|,]\s*/))

		if (footerItems.length > 0) {
			const pillData = footerItems.map(text => ({
				text: text.trim(),
				width: this.estimateTextWidth(text.trim(), pillFontSize, true) + Math.round(pillH * 1.2),
			}))

			// If pills too wide, scale them to fit
			const totalW = pillData.reduce((s, p) => s + p.width, 0) + pillGap * (pillData.length - 1)
			const scale = totalW > maxTextW ? maxTextW / totalW : 1
			if (scale < 1) pillData.forEach(p => p.width = Math.round(p.width * scale))

			let startX = cx - (pillData.reduce((s, p) => s + p.width, 0) + pillGap * (pillData.length - 1)) / 2

			for (const pill of pillData) {
				// Dark pill with white border
				els.push(
					`<rect x="${startX}" y="${pillY}" width="${pill.width}" height="${pillH}"` +
					` rx="${pillR}" ry="${pillR}" fill="#000000" fill-opacity="0.5"/>`
				)
				els.push(
					`<rect x="${startX}" y="${pillY}" width="${pill.width}" height="${pillH}"` +
					` rx="${pillR}" ry="${pillR}" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1"/>`
				)
				els.push(
					`<text x="${startX + pill.width / 2}" y="${pillY + pillH * 0.65}" text-anchor="middle"` +
					` font-family="${SANS}" font-size="${pillFontSize}" font-weight="700"` +
					` fill="#FFFFFF" letter-spacing="0.5"` +
					`>${this.esc(pill.text)}</text>`
				)
				startX += pill.width + pillGap
			}
		}

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Template: explorer-poster (Bold cinematic travel ad) ─────
	//
	//    Layout (Bali Explorer reference):
	//
	//    ┌────────────────────────────┐
	//    │     BALI • INDONESIA       │  ← top label (small, white, spaced)
	//    │      Rayna Tours           │  ← brand (small, white)
	//    │                            │
	//    │        Explore             │  ← script accent (yellow/gold)
	//    │         BALI              │  ← large bold sans-serif (white)
	//    │                            │
	//    │  UBUD • SEMINYAK • KUTA    │  ← sub-locations (small, white)
	//    │                            │
	//    │ ▓▓▓▓▓▓ gradient ▓▓▓▓▓▓▓▓ │
	//    │ ┌──────────────────────┐   │
	//    │ │ STARTING FROM AED 35 │   │  ← yellow rounded banner
	//    │ │      | 4N-5D         │   │
	//    │ └──────────────────────┘   │
	//    │                            │
	//    │ +971 4 208 7444  +91 20..  │  ← split contact footer
	//    └────────────────────────────┘

	private svgExplorerPoster(w: number, h: number, config: OverlayConfig): string {
		const p = config.poster
		if (!p) return this.svgEmpty(w, h)

		const els: string[] = []
		const cx = w / 2
		const pad = Math.round(w * 0.06)
		const maxTextW = w - pad * 2

		const SCRIPT = 'Great Vibes, Dancing Script, cursive'
		const SANS = 'Montserrat, Arial, Helvetica, sans-serif'
		const GOLD = '#F5C542'

		// ── Auto-size headline to fit width ──
		// Measure headline text width and shrink if it overflows
		const headlineText = p.headline.toUpperCase()
		let headlineSize = Math.round(h * 0.075)
		const headlineTextW = this.estimateTextWidth(headlineText, headlineSize, true)
		if (headlineTextW > maxTextW) {
			// Scale down to fit
			headlineSize = Math.round(headlineSize * (maxTextW / headlineTextW) * 0.9)
		}
		const headlineLH = Math.round(headlineSize * 1.05)

		const exploreSize = Math.round(h * 0.055)
		const subLocSize = Math.round(h * 0.012)
		const bannerFontSize = Math.round(h * 0.016)
		const bannerH = Math.round(h * 0.04)
		const contactSize = Math.round(h * 0.014)

		// ── Defs ──
		els.push(
			`<defs>` +
			`<filter id="ts" x="-10%" y="-10%" width="120%" height="120%">` +
			`<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>` +
			`</filter>` +
			`<linearGradient id="pg" x1="0" y1="0.6" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="25%" stop-color="#000000" stop-opacity="0.25"/>` +
			`<stop offset="60%" stop-color="#000000" stop-opacity="0.55"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.82"/>` +
			`</linearGradient>` +
			`<linearGradient id="tg" x1="0" y1="0" x2="0" y2="0.15">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
			`</linearGradient>` +
			`</defs>`
		)

		els.push(`<rect x="0" y="${Math.round(h * 0.6)}" width="${w}" height="${Math.round(h * 0.4)}" fill="url(#pg)"/>`)
		els.push(`<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.15)}" fill="url(#tg)"/>`)

		// ── 1. Brand logo — composited via sharp (see renderPoster) ──

		// ── 2. "Explore" script (yellow) ──
		const exploreY = Math.round(h * 0.12)
		els.push(
			`<text x="${cx}" y="${exploreY}" text-anchor="middle"` +
			` font-family="${SCRIPT}" font-size="${exploreSize}" font-weight="400"` +
			` fill="${GOLD}" filter="url(#ts)"` +
			`>Explore</text>`
		)

		// ── 3. Bold headline — auto-split into lines that fit ──
		const headlineWords = p.headline.split(/\s+/)
		const headlineLines: string[] = []

		// Smart wrapping: split into lines that each fit within maxTextW
		let currentLine = ''
		for (const word of headlineWords) {
			const testLine = currentLine ? `${currentLine} ${word}` : word
			if (this.estimateTextWidth(testLine.toUpperCase(), headlineSize, true) > maxTextW && currentLine) {
				headlineLines.push(currentLine.toUpperCase())
				currentLine = word
			} else {
				currentLine = testLine
			}
		}
		if (currentLine) headlineLines.push(currentLine.toUpperCase())

		// Position headline just below "Explore" with a small gap
		const headlineStartY = exploreY + Math.round(exploreSize * 0.4) + headlineSize
		headlineLines.forEach((line, i) => {
			els.push(
				`<text x="${cx}" y="${headlineStartY + i * headlineLH}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${headlineSize}" font-weight="800"` +
				` fill="#FFFFFF" letter-spacing="3" filter="url(#ts)"` +
				`>${this.esc(line)}</text>`
			)
		})

		// ── 4. Sub-locations — ONLY show if short keyword-style text ──
		const afterHeadlineY = headlineStartY + headlineLines.length * headlineLH
		let subText = p.subheadline || ''
		if (subText) {
			// Skip if it looks like a long description (>40 chars without separators)
			const hasSeparators = /[,|•·]/.test(subText)
			if (!hasSeparators && subText.length > 40) {
				subText = '' // Don't show long descriptions
			} else {
				subText = subText.toUpperCase().replace(/[,|]+\s*/g, ' \u2022 ')
				if (subText.length > 45) subText = subText.slice(0, 42) + '...'
			}
		}
		if (subText) {
			const subY = afterHeadlineY + Math.round(subLocSize * 2.5)
			els.push(
				`<text x="${cx}" y="${subY}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${subLocSize}" font-weight="600"` +
				` fill="#FFFFFF" fill-opacity="0.85" letter-spacing="2" filter="url(#ts)"` +
				`>${this.esc(subText)}</text>`
			)
		}

		// ── 5. Yellow banner — always show price + dates together ──
		if (p.price || p.dates) {
			const parts: string[] = []
			if (p.price) parts.push(p.price)
			if (p.dates) parts.push(p.dates)
			const bannerText = parts.join('  |  ')

			const bannerTextW = this.estimateTextWidth(bannerText, bannerFontSize, true)
			const bannerW = Math.min(bannerTextW + Math.round(bannerH * 2.5), w - pad * 2)
			const bannerX = cx - bannerW / 2
			const bannerY = Math.round(h * 0.83)
			const bannerR = Math.round(bannerH * 0.3)

			els.push(
				`<rect x="${bannerX}" y="${bannerY}" width="${bannerW}" height="${bannerH}"` +
				` rx="${bannerR}" ry="${bannerR}" fill="${GOLD}"/>`
			)
			els.push(
				`<text x="${cx}" y="${bannerY + bannerH * 0.66}" text-anchor="middle"` +
				` font-family="${SANS}" font-size="${bannerFontSize}" font-weight="800"` +
				` fill="#1A1A1A" letter-spacing="1"` +
				`>${this.esc(bannerText)}</text>`
			)
		}

		// ── 6. Contact footer — split left/right (yellow) ──
		const contactY = Math.round(h * 0.95)
		if (p.contact) {
			const contacts = p.contact.split(/\s*\|\s*/)
			if (contacts.length >= 2) {
				els.push(
					`<text x="${pad}" y="${contactY}" text-anchor="start"` +
					` font-family="${SANS}" font-size="${contactSize}" font-weight="600"` +
					` fill="${GOLD}" letter-spacing="0.5" filter="url(#ts)"` +
					`>${this.esc(contacts[0].trim())}</text>`
				)
				els.push(
					`<text x="${w - pad}" y="${contactY}" text-anchor="end"` +
					` font-family="${SANS}" font-size="${contactSize}" font-weight="600"` +
					` fill="${GOLD}" letter-spacing="0.5" filter="url(#ts)"` +
					`>${this.esc(contacts[1].trim())}</text>`
				)
			} else {
				els.push(
					`<text x="${cx}" y="${contactY}" text-anchor="middle"` +
					` font-family="${SANS}" font-size="${contactSize}" font-weight="600"` +
					` fill="${GOLD}" filter="url(#ts)"` +
					`>${this.esc(p.contact)}</text>`
				)
			}
		}

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Empty SVG ───────────────────────────────────────────────────

	private svgEmpty(w: number, h: number): string {
		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"></svg>`
	}

	// ── Utilities ───────────────────────────────────────────────────

	getTargetDimensions(srcW: number, srcH: number, requestedRatio: AspectRatio): CanvasDimensions {
		if (requestedRatio !== 'auto') {
			return { ...INSTAGRAM_DIMENSIONS[requestedRatio], ratio: requestedRatio }
		}
		const srcRatio = srcW / srcH
		if (srcRatio >= 1.5) return { ...INSTAGRAM_DIMENSIONS['1.91:1'], ratio: '1.91:1' }
		if (srcRatio >= 0.85) return { ...INSTAGRAM_DIMENSIONS['1:1'], ratio: '1:1' }
		return { ...INSTAGRAM_DIMENSIONS['4:5'], ratio: '4:5' }
	}

	private wrapText(text: string, maxWidthPx: number, fontSize: number, isBold: boolean): string[] {
		const words = text.split(/\s+/)
		const lines: string[] = []
		let cur = ''
		for (const word of words) {
			const test = cur ? `${cur} ${word}` : word
			if (this.estimateTextWidth(test, fontSize, isBold) > maxWidthPx && cur) {
				lines.push(cur)
				cur = word
			} else {
				cur = test
			}
		}
		if (cur) lines.push(cur)
		return lines
	}

	private estimateTextWidth(text: string, fontSize: number, isBold = false): number {
		return text.length * fontSize * (isBold ? 0.58 : 0.5)
	}

	private esc(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;')
	}

	// ── Template: lifestyle-poster (Editorial travel ad with human element) ──
	//
	//    Layout (Bali lifestyle reference):
	//
	//    ┌──────────────────────────────┐
	//    │    ░░ top vignette ░░░░░░░░ │
	//    │                              │
	//    │           B A L I            │  ← large serif headline, wide letter-spacing
	//    │  Serenity, Shores & Island   │  ← italic tagline
	//    │          Magic               │
	//    │                              │
	//    │                              │
	//    │  From hidden gems            │  ← italic description (left-aligned)
	//    │  to iconic views,            │
	//    │  discover unforgettable      │
	//    │  moments.                    │
	//    │                              │
	//    │  ┌───────────┐               │
	//    │  │ BOOK NOW  │               │  ← rounded CTA pill button
	//    │  └───────────┘               │
	//    │                              │
	//    │ ▓▓▓▓▓ bottom gradient ▓▓▓▓ │
	//    │       [RAYNA LOGO]           │  ← brand logo (composited via sharp)
	//    └──────────────────────────────┘
	//
	//    Human traveler added via AI post-processing (bottom-right)

	private svgLifestylePoster(w: number, h: number, config: OverlayConfig): string {
		const p = config.poster
		if (!p) return this.svgEmpty(w, h)

		const els: string[] = []
		const pad = Math.round(w * 0.08)

		// ── Font families ──
		const SERIF = 'Playfair Display, Georgia, serif'
		const ITALIC = 'Lora, Georgia, serif'
		const SANS = 'Montserrat, Arial, sans-serif'

		// ── Font sizes (proportional — tuned to match Bali reference) ──
		// Dynamic headline: scale down font + letter-spacing for longer titles
		const headlineChars = p.headline.length
		const headlineSizeBase = headlineChars <= 6 ? 0.085 : headlineChars <= 10 ? 0.07 : headlineChars <= 16 ? 0.055 : 0.045
		const headlineSpacingRatio = headlineChars <= 6 ? 0.35 : headlineChars <= 10 ? 0.25 : headlineChars <= 16 ? 0.18 : 0.12
		const headlineSize = Math.round(h * headlineSizeBase)
		const taglineSize = Math.round(h * 0.02)      // small italic tagline
		const descSize = Math.round(h * 0.022)        // italic description
		const descLH = Math.round(descSize * 1.7)     // relaxed line height
		const ctaSize = Math.round(h * 0.016)         // CTA button text

		// ── Filters & gradients ──
		els.push(
			`<defs>` +
			// Text shadow
			`<filter id="lts" x="-5%" y="-5%" width="110%" height="110%">` +
			`<feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="#000000" flood-opacity="0.45"/>` +
			`</filter>` +
			// Top vignette — subtle dark for headline readability
			`<linearGradient id="ltg" x1="0" y1="0" x2="0" y2="0.25">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0.4"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
			`</linearGradient>` +
			// Bottom gradient — for logo area
			`<linearGradient id="lbg" x1="0" y1="0.78" x2="0" y2="1">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0"/>` +
			`<stop offset="50%" stop-color="#000000" stop-opacity="0.3"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>` +
			`</linearGradient>` +
			// Left side gradient for description readability
			`<linearGradient id="llg" x1="0" y1="0" x2="0.5" y2="0">` +
			`<stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>` +
			`<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
			`</linearGradient>` +
			`</defs>`
		)

		// ── Gradient overlays ──
		els.push(`<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.25)}" fill="url(#ltg)"/>`)
		els.push(`<rect x="0" y="${Math.round(h * 0.78)}" width="${w}" height="${Math.round(h * 0.22)}" fill="url(#lbg)"/>`)
		// Left side gradient for description area
		els.push(`<rect x="0" y="${Math.round(h * 0.45)}" width="${Math.round(w * 0.55)}" height="${Math.round(h * 0.35)}" fill="url(#llg)"/>`)

		// ── 1. Headline — large serif with wide letter spacing ──
		const headlineY = Math.round(h * 0.12)
		const cx = w / 2
		els.push(
			`<text x="${cx}" y="${headlineY}" text-anchor="middle"` +
			` font-family="${SERIF}" font-size="${headlineSize}" font-weight="400"` +
			` fill="#FFFFFF" letter-spacing="${Math.round(headlineSize * headlineSpacingRatio)}" filter="url(#lts)"` +
			`>${this.esc(p.headline.toUpperCase())}</text>`
		)

		// ── 2. Tagline — italic, centered below headline ──
		if (p.tagline || p.subheadline) {
			const tagline = p.tagline || p.subheadline || ''
			const taglineY = headlineY + Math.round(taglineSize * 2.2)
			els.push(
				`<text x="${cx}" y="${taglineY}" text-anchor="middle"` +
				` font-family="${ITALIC}" font-size="${taglineSize}" font-weight="400"` +
				` font-style="italic" fill="#FFFFFF" fill-opacity="0.9" letter-spacing="1" filter="url(#lts)"` +
				`>${this.esc(tagline)}</text>`
			)
		}

		// ── 3. Description — italic, left-aligned, mid-left area (max 4 lines) ──
		const descStartY = Math.round(h * 0.55)
		const descLines: string[] = []

		// Use subheadline if short enough, otherwise use default editorial copy
		const descSource = (p.subheadline && p.subheadline.length <= 80)
			? p.subheadline
			: 'From hidden gems to iconic views, discover unforgettable moments.'

		// Split on explicit newlines first, then word-wrap each segment
		const segments = descSource.split(/\\n|\n/)
		for (const seg of segments) {
			const words = seg.trim().split(/\s+/)
			let line = ''
			for (const word of words) {
				if ((line + ' ' + word).trim().length > 22 && line) {
					descLines.push(line)
					line = word
				} else {
					line = line ? line + ' ' + word : word
				}
			}
			if (line) descLines.push(line)
		}
		// Cap at 4 lines max
		descLines.splice(4)

		descLines.forEach((line, i) => {
			els.push(
				`<text x="${pad}" y="${descStartY + i * descLH}" text-anchor="start"` +
				` font-family="${ITALIC}" font-size="${descSize}" font-weight="400"` +
				` font-style="italic" fill="#FFFFFF" filter="url(#lts)"` +
				`>${this.esc(line)}</text>`
			)
		})

		// ── 4. CTA Button — rounded pill, left-aligned below description ──
		const ctaText = p.contact ? 'BOOK NOW' : 'BOOK NOW'
		const ctaY = descStartY + descLines.length * descLH + Math.round(h * 0.03)
		const ctaTextW = this.estimateTextWidth(ctaText, ctaSize, true)
		const ctaPadX = Math.round(ctaSize * 2)
		const ctaPadY = Math.round(ctaSize * 0.9)
		const ctaW = ctaTextW + ctaPadX * 2
		const ctaH = Math.round(ctaSize + ctaPadY * 2)
		const ctaR = Math.round(ctaH / 2)

		els.push(
			`<rect x="${pad}" y="${ctaY}" width="${ctaW}" height="${ctaH}"` +
			` rx="${ctaR}" ry="${ctaR}" fill="#F5F0E8" fill-opacity="0.92"/>` +
			`<text x="${pad + ctaW / 2}" y="${ctaY + ctaH / 2 + ctaSize * 0.35}" text-anchor="middle"` +
			` font-family="${SANS}" font-size="${ctaSize}" font-weight="700"` +
			` fill="#2C2C2C" letter-spacing="2"` +
			`>${this.esc(ctaText)}</text>`
		)

		// ── 5. Brand logo — composited via sharp (see renderPoster) ──
		// Logo is added programmatically in renderPoster/enforceFormatAndLogo

		return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${els.join('')}</svg>`
	}

	// ── Poster API (used by design template flow) ──────────────────

	async renderPoster(imageBuffer: Buffer, poster: PosterConfig, aspectRatio: AspectRatio = '4:5'): Promise<Buffer> {
		const target = INSTAGRAM_DIMENSIONS[aspectRatio === 'auto' ? '4:5' : aspectRatio]
		const { width: w, height: h } = target
		const pad = Math.round(w * 0.06)

		const baseBuffer = await sharp(imageBuffer)
			.resize(w, h, { fit: 'cover', position: 'attention' })
			.toBuffer()

		// Route to the correct SVG layout
		const layoutToTemplate: Record<string, TemplateName> = {
			'heritage': 'heritage-poster',
			'bold-adventure': 'adventure-poster',
			'explorer': 'explorer-poster',
			'lifestyle': 'lifestyle-poster',
			'brush-script': 'poster',
		}
		const templateName: TemplateName = layoutToTemplate[poster.layout || 'brush-script'] || 'poster'
		const svgOverlay = this.buildOverlaySvg(w, h, { template: templateName, poster })

		let result = await sharp(baseBuffer)
			.composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
			.png({ quality: 95 })
			.toBuffer()

		// Composite brand logo on top
		const logoPos = this.getLogoPosition(poster.layout || 'brush-script', w, h, pad)
		result = await this.compositeLogoOnImage(result, logoPos)

		return result
	}

	private getLogoPosition(layout: string, w: number, h: number, pad: number) {
		const logoH = Math.round(h * 0.055)
		const logoW = Math.round(logoH * 3.5) // approximate aspect ratio of Rayna logo

		switch (layout) {
			case 'explorer':
				return { top: Math.round(h * 0.015), left: pad, width: logoW, height: logoH }
			case 'bold-adventure':
				return { top: Math.round(h * 0.015), left: pad, width: logoW, height: logoH }
			case 'heritage':
				return { top: Math.round(h * 0.91), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
			case 'lifestyle':
				// Bottom center — like the Bali reference image
				return { top: Math.round(h * 0.915), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
			case 'brush-script':
			default:
				return { top: Math.round(h * 0.015), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
		}
	}

	/**
	 * Enforce exact platform dimensions on a buffer and re-composite the brand logo.
	 * Use after any external AI edit that may have changed the size or destroyed the logo.
	 */
	async enforceFormatAndLogo(
		imageBuffer: Buffer,
		aspectRatio: AspectRatio = '4:5',
		layout: PosterLayout = 'brush-script',
	): Promise<Buffer> {
		const target = INSTAGRAM_DIMENSIONS[aspectRatio === 'auto' ? '4:5' : aspectRatio]
		const { width: w, height: h } = target
		const pad = Math.round(w * 0.06)

		let result = await sharp(imageBuffer)
			.resize(w, h, { fit: 'cover', position: 'attention' })
			.png({ quality: 95 })
			.toBuffer()

		const logoPos = this.getLogoPosition(layout, w, h, pad)
		result = await this.compositeLogoOnImage(result, logoPos)

		return result
	}

	// ── Legacy API (used by image.controller) ───────────────────────

	async applyOverlay(options: { imagePath: string; overlays: Array<{ text: string }>; outputFormat?: string; quality?: number }): Promise<string> {
		const title = options.overlays.map((o) => o.text).join(' — ')
		return this.processImageToFile(options.imagePath, { template: 'gradient-cta', title })
	}

	async applyPriceTag(options: { imagePath: string; price: string; offerLabel?: string; ctaText?: string }): Promise<string> {
		return this.processImageToFile(options.imagePath, {
			template: 'gradient-cta',
			title: options.price,
			ctaText: options.ctaText,
		})
	}

	async processCarousel(slides: Array<{ imagePath: string; overlayText: string; priceText?: string; ctaText?: string }>): Promise<string[]> {
		return Promise.all(
			slides.map((slide) =>
				this.processImageToFile(slide.imagePath, {
					template: 'gradient-cta',
					title: slide.overlayText || slide.priceText || '',
					ctaText: slide.ctaText,
				})
			)
		)
	}
}

export const imageOverlayService = new ImageOverlayService()
