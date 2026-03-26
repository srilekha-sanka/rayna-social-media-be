import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { UPLOAD_DIR } from '../../config/upload.config'
import { cloudinaryService } from '../cloudinary/cloudinary.service'
import { logger } from '../../common/logger/logging'

// ── Types ────────────────────────────────────────────────────────────

export type AspectRatio = '1:1' | '4:5' | '1.91:1' | 'auto'
export type TemplateName = 'gradient-cta' | 'minimal-text' | 'full-bleed'

export interface OverlayConfig {
	template: TemplateName
	aspectRatio?: AspectRatio
	title?: string
	subtitle?: string
	ctaText?: string
	accentColor?: string
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
