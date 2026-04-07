import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { UPLOAD_DIR } from '../../config/upload.config'
import { cloudinaryService } from '../cloudinary/cloudinary.service'
import { logger } from '../../common/logger/logging'
import { env } from '../../../db/config/env.config'
import { templateRenderer, TemplateData } from './template-renderer.service'

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

const INSTAGRAM_DIMENSIONS: Record<Exclude<AspectRatio, 'auto'>, { width: number; height: number }> = {
	'1:1': { width: 1080, height: 1080 },
	'4:5': { width: 1080, height: 1350 },
	'1.91:1': { width: 1080, height: 566 },
}

const LAYOUT_TO_TEMPLATE: Record<string, TemplateName> = {
	'heritage': 'heritage-poster',
	'bold-adventure': 'adventure-poster',
	'explorer': 'explorer-poster',
	'lifestyle': 'lifestyle-poster',
	'brush-script': 'poster',
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

		const localPath = path.join(__dirname, '../../../../assets/rayna-logo.png')
		if (fs.existsSync(localPath)) {
			this.logoCache = fs.readFileSync(localPath)
			return this.logoCache
		}

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
			baseBuffer = await this.extendLandscapeToPortrait(imagePath, target)
		} else {
			baseBuffer = await sharp(imagePath)
				.resize(target.width, target.height, { fit: 'cover', position: 'attention' })
				.toBuffer()
		}

		if (config.template === 'full-bleed') {
			const outputBuffer = await sharp(baseBuffer).jpeg({ quality: 92 }).toBuffer()
			return { buffer: outputBuffer, width: target.width, height: target.height, aspectRatio: target.ratio }
		}

		// Render overlay from HTML template
		const templateData = this.buildTemplateData(config)
		const overlayBuffer = await templateRenderer.render(
			config.template,
			templateData,
			{ width: target.width, height: target.height },
		)

		// Composite the HTML-rendered overlay on top of the base image
		const outputBuffer = await sharp(baseBuffer)
			.composite([{ input: overlayBuffer, top: 0, left: 0 }])
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

	// ── Poster API (used by design template flow) ───────────────────

	async renderPoster(imageBuffer: Buffer, poster: PosterConfig, aspectRatio: AspectRatio = '4:5'): Promise<Buffer> {
		const resolvedRatio = aspectRatio === 'auto' ? '4:5' : aspectRatio
		const dims = INSTAGRAM_DIMENSIONS[resolvedRatio]
		const { width: w, height: h } = dims
		const pad = Math.round(w * 0.06)
		const target: CanvasDimensions = { width: w, height: h, ratio: resolvedRatio }

		// Detect landscape images and extend to portrait via Cloudinary gen fill
		const metadata = await sharp(imageBuffer).metadata()
		const srcW = metadata.width || 1080
		const srcH = metadata.height || 1080
		const srcRatio = srcW / srcH

		let baseBuffer: Buffer
		if (srcRatio > 1.2) {
			// Landscape → save to temp file for Cloudinary gen fill
			const tmpPath = path.join(PROCESSED_DIR, `tmp-poster-${Date.now()}.png`)
			fs.writeFileSync(tmpPath, imageBuffer)
			try {
				baseBuffer = await this.extendLandscapeToPortrait(tmpPath, target)
			} finally {
				if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
			}
		} else {
			baseBuffer = await sharp(imageBuffer)
				.resize(w, h, { fit: 'cover', position: 'attention' })
				.toBuffer()
		}

		// Resolve template from layout
		const templateName: TemplateName = LAYOUT_TO_TEMPLATE[poster.layout || 'brush-script'] || 'poster'
		const templateData = this.buildPosterTemplateData(poster, templateName)

		const overlayBuffer = await templateRenderer.render(
			templateName,
			templateData,
			{ width: w, height: h },
		)

		let result = await sharp(baseBuffer)
			.composite([{ input: overlayBuffer, top: 0, left: 0 }])
			.png({ quality: 95 })
			.toBuffer()

		// Composite brand logo on top
		const logoPos = this.getLogoPosition(poster.layout || 'brush-script', w, h, pad)
		result = await this.compositeLogoOnImage(result, logoPos)

		return result
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

	// ── Private: Landscape → Portrait via Cloudinary Generative Fill ──

	private async extendLandscapeToPortrait(imagePath: string, target: CanvasDimensions): Promise<Buffer> {
		if (cloudinaryService.enabled) {
			try {
				const result = await cloudinaryService.generativeFill(imagePath, {
					folder: 'rayna/carousel',
					aspectRatio: `${target.width}:${target.height}`,
					width: target.width,
					height: target.height,
				})

				const genFillUrl = cloudinaryService.getEagerUrl(result)
				logger.info(`Cloudinary gen_fill applied: ${genFillUrl}`)
				return this.downloadToBuffer(genFillUrl)
			} catch (err: any) {
				logger.error(`Cloudinary gen_fill failed, falling back to cover crop: ${err.message}`)
			}
		}

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

	// ── Private: Template data builders ─────────────────────────────

	private buildTemplateData(config: OverlayConfig): TemplateData {
		return {
			title: config.title || '',
			subtitle: config.subtitle || '',
			ctaText: config.ctaText || '',
			accentColor: config.accentColor || '#F97316',
		}
	}

	private buildPosterTemplateData(poster: PosterConfig, templateName: TemplateName): TemplateData {
		const base: TemplateData = {
			brand_name: poster.brand_name,
			headline: poster.headline,
			subheadline: poster.subheadline || '',
			tagline: poster.tagline || '',
			price: poster.price || '',
			includes: poster.includes || '',
			dates: poster.dates || '',
			duration: poster.duration || '',
			contact: poster.contact || '',
		}

		switch (templateName) {
			case 'heritage-poster': {
				const firstWord = poster.headline.split(/\s+/)[0] || poster.headline
				const subTitle = poster.subheadline && poster.subheadline.length <= 25
					? poster.subheadline.toUpperCase()
					: `${firstWord.toUpperCase()} EXPERIENCE`
				const hasKeywords = poster.tagline && /[•|·]/.test(poster.tagline)
				const subtitleKeywords = hasKeywords
					? poster.tagline!.toUpperCase()
					: 'HERITAGE \u2022 CULTURE \u2022 ESCAPE'
				const brandTagline = poster.tagline && !/[•|·]/.test(poster.tagline)
					? poster.tagline
					: 'by your side'

				// Dynamic headline size for the big script word
				const hLen = firstWord.length
				let hHeadlineFontSize: string
				if (hLen <= 4) {
					hHeadlineFontSize = '26vh'    // Bali
				} else if (hLen <= 7) {
					hHeadlineFontSize = '20vh'    // Dubai, Oman
				} else if (hLen <= 10) {
					hHeadlineFontSize = '16vh'    // Istanbul
				} else {
					hHeadlineFontSize = '12vh'    // Marrakech
				}

				// Parse price
				const hPriceMatch = (poster.price || '').match(/^(AED|USD|INR|EUR|GBP)?\s*(.+)$/i)
				const hCurrency = hPriceMatch?.[1]?.toUpperCase() || 'AED'
				const hAmount = (hPriceMatch?.[2] || poster.price || '').replace('/-', '')

				// Format includes as stacked lines
				const hIncItems = (poster.includes || '').replace(/[,;]+\s*/g, ' | ').split(' | ')
				const hIncFormatted = hIncItems.map(i => i.trim().toUpperCase()).join('\n')

				return {
					...base,
					headline: firstWord,
					headlineFontSize: hHeadlineFontSize,
					subheadline: subTitle,
					tagline: subtitleKeywords,
					brandTagline,
					currency: hCurrency,
					amount: hAmount,
					includesFormatted: hIncFormatted,
				}
			}

			case 'adventure-poster': {
				// Parse price into currency + amount
				const priceMatch = (poster.price || '').match(/^(AED|USD|INR|EUR|GBP)?\s*(.+)$/i)
				const currency = priceMatch?.[1]?.toUpperCase() || 'AED'
				const amount = priceMatch?.[2] || poster.price || ''
				const incItems = (poster.includes || '').replace(/[,;]+\s*/g, ' | ').split(' | ')

				// Dynamic headline size — Kaushan Script, needs to dominate top 35%
				const advChars = poster.headline.replace(/\s/g, '').length
				const advWords = poster.headline.trim().split(/\s+/).length
				let advHeadlineFontSize: string
				if (advChars <= 5 && advWords === 1) {
					advHeadlineFontSize = '22vh'    // single short: Bali, Dubai
				} else if (advChars <= 10 && advWords <= 2) {
					advHeadlineFontSize = '18vh'    // short pair: Bali Escape
				} else if (advChars <= 16) {
					advHeadlineFontSize = '14vh'    // medium: Desert Safari
				} else {
					advHeadlineFontSize = '11vh'    // long: Evening Desert Safari
				}

				return {
					...base,
					headlineFontSize: advHeadlineFontSize,
					currency,
					amount,
					includes: incItems.map(i => i.trim().toUpperCase()).join('   |   '),
				}
			}

			case 'explorer-poster': {
				// Build banner text and split contacts
				const bannerParts: string[] = []
				if (poster.price) bannerParts.push(`STARTING FROM ${poster.price}`)
				if (poster.duration) bannerParts.push(poster.duration)
				else if (poster.dates) bannerParts.push(poster.dates)
				const contacts = (poster.contact || '').split(/\s*\|\s*/)

				// Sub-locations: only use subheadline if it looks like a short
				// location list (has separators and is short). Ignore long descriptions.
				let subLocs = ''
				if (poster.subheadline) {
					const hasSeparators = /[,|•·\-]/.test(poster.subheadline)
					if (hasSeparators && poster.subheadline.length <= 60) {
						subLocs = poster.subheadline.toUpperCase().replace(/[,|•·]+\s*/g, ' - ')
					}
				}

				// Dynamic headline size — Bebas Neue is condensed, so sizes are larger
				const chars = poster.headline.replace(/\s/g, '').length
				const words = poster.headline.trim().split(/\s+/).length
				let headlineFontSize: string
				if (chars <= 8 && words === 1) {
					headlineFontSize = '16vh'     // single short word: HIMACHAL, BALI
				} else if (chars <= 12 && words <= 2) {
					headlineFontSize = '13vh'     // two short words: JEBEL JAIS
				} else if (chars <= 18) {
					headlineFontSize = '10vh'     // medium: EVENING DESERT, MUSEUM FUTURE
				} else {
					headlineFontSize = '8vh'      // long: EVENING DESERT SAFARI
				}

				return {
					...base,
					headline: poster.headline.toUpperCase(),
					headlineFontSize,
					subheadline: subLocs,
					bannerText: bannerParts.join('  |  '),
					contactLeft: contacts[0]?.trim() || '',
					contactRight: contacts[1]?.trim() || '',
				}
			}

			case 'lifestyle-poster': {
				// Description from subheadline or default
				const description = poster.subheadline && poster.subheadline.length <= 80
					? poster.subheadline
					: 'From hidden gems to iconic views, discover unforgettable moments.'
				return {
					...base,
					headline: poster.headline.toUpperCase(),
					description,
				}
			}

			default:
				return base
		}
	}

	private getLogoPosition(layout: string, w: number, h: number, pad: number) {
		const logoH = Math.round(h * 0.055)
		const logoW = Math.round(logoH * 3.5)

		switch (layout) {
			case 'explorer':
				return { top: Math.round(h * 0.015), left: pad, width: logoW, height: logoH }
			case 'bold-adventure':
				return { top: Math.round(h * 0.015), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
			case 'heritage':
				return { top: Math.round(h * 0.03), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
			case 'lifestyle':
				return { top: Math.round(h * 0.915), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
			case 'brush-script':
			default:
				return { top: Math.round(h * 0.015), left: Math.round(w / 2 - logoW / 2), width: logoW, height: logoH }
		}
	}
}

export const imageOverlayService = new ImageOverlayService()
