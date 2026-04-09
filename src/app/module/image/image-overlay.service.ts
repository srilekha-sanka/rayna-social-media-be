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
export type TemplateName = 'gradient-cta' | 'minimal-text' | 'full-bleed' | 'poster' | 'heritage-poster' | 'adventure-poster' | 'explorer-poster' | 'lifestyle-poster' | 'luxury-poster' | 'promo-poster' | 'nature-poster' | 'culinary-poster' | 'city-poster' | 'family-poster' | 'collage-poster'
export type PosterLayout = 'brush-script' | 'heritage' | 'bold-adventure' | 'explorer' | 'lifestyle' | 'luxury' | 'promo' | 'nature' | 'culinary' | 'city' | 'family' | 'collage'

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
	location?: string
	promo_code?: string
	layout?: PosterLayout
	collageBuffers?: Buffer[]
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
	'luxury': 'luxury-poster',
	'promo': 'promo-poster',
	'nature': 'nature-poster',
	'culinary': 'culinary-poster',
	'city': 'city-poster',
	'family': 'family-poster',
	'collage': 'collage-poster',
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

		// Detect landscape images and extend to portrait via Cloudinary gen fill ONLY if target is portrait
		const metadata = await sharp(imageBuffer).metadata()
		const srcW = metadata.width || 1080
		const srcH = metadata.height || 1080
		const srcRatio = srcW / srcH
		const isTargetPortrait = h > w

		let baseBuffer: Buffer
		if (srcRatio > 1.2 && isTargetPortrait) {
			// Landscape source → Portrait target: Use Gen Fill to avoid cropping edges
			const tmpPath = path.join(PROCESSED_DIR, `tmp-poster-${Date.now()}.png`)
			fs.writeFileSync(tmpPath, imageBuffer)
			try {
				baseBuffer = await this.extendLandscapeToPortrait(tmpPath, target)
			} finally {
				if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
			}
		} else {
			// Target matches source or target is landscape: Clean cover crop is safer and more "cinematic"
			baseBuffer = await sharp(imageBuffer)
				.resize(w, h, { fit: 'cover', position: 'attention' })
				.toBuffer()
		}

		// Resolve template from layout
		const templateName: TemplateName = LAYOUT_TO_TEMPLATE[poster.layout || 'brush-script'] || 'poster'
		const templateData = this.buildPosterTemplateData(poster, templateName)

		// Inject logo as base64 data URI (Puppeteer blocks external image requests)
		if (templateData.logoUrl !== undefined) {
			const logoBuf = await this.getLogoBuffer()
			templateData.logoUrl = logoBuf
				? `data:image/png;base64,${logoBuf.toString('base64')}`
				: ''
		}

		const overlayBuffer = await templateRenderer.render(
			templateName,
			templateData,
			{ width: w, height: h },
		)

		let result = await sharp(baseBuffer)
			.composite([{ input: overlayBuffer, top: 0, left: 0 }])
			.png({ quality: 95 })
			.toBuffer()

		// Composite brand logo on top (disabled: the WOW templates handle brand names natively via elegant typography)
		/*
		if (poster.layout !== 'explorer') {
			const logoPos = this.getLogoPosition(poster.layout || 'brush-script', w, h, pad)
			result = await this.compositeLogoOnImage(result, logoPos)
		}
		*/

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
			brand_name: poster.brand_name?.toUpperCase() || 'RAYNA TOURS',
			headline: poster.headline || '',
			subheadline: poster.subheadline || '',
			tagline: poster.tagline || '',
			price: poster.price || '',
			includes: poster.includes || '',
			dates: poster.dates || '',
			duration: poster.duration || '',
			contact: poster.contact || '',
		}

		// Helper to format includes
		const formatIncludes = (separator: string) => {
			if (!poster.includes) return ''
			return poster.includes.replace(/[,;]+\s*/g, ' | ').split(' | ').join(separator)
		}

		switch (templateName) {
			case 'heritage-poster': {
				const firstWord = poster.headline.split(/\s+/)[0] || poster.headline
				const subTitle = poster.subheadline && poster.subheadline.length <= 40
					? poster.subheadline.toUpperCase()
					: `${firstWord.toUpperCase()} ADVENTURE`
				const brandTagline = poster.tagline && !/[•|·]/.test(poster.tagline)
					? poster.tagline
					: 'Curated by Experts'

				return {
					...base,
					headline: firstWord,
					subheadline: subTitle,
					brandTagline,
					includes: formatIncludes('\n'),
				}
			}

			case 'adventure-poster': {
				const category = (poster.subheadline || 'Adventure').split(/\s+/).slice(0, 2).join(' ')
				return {
					...base,
					category,
					includes: formatIncludes('   •   '),
				}
			}

			case 'explorer-poster': {
				return {
					...base,
					headline: poster.headline.split(/\s+/).slice(0, 2).join('\n'), // Stack first two words max
					destination: poster.headline,
					includes: formatIncludes(' • '),
				}
			}

			case 'lifestyle-poster': {
				const category = 'Exclusive Getaway'
				const overline = poster.tagline || 'Experience the Extraordinary'
				const description = poster.subheadline && poster.subheadline.length <= 80
					? poster.subheadline
					: 'From hidden gems to iconic views, discover unforgettable moments filled with adventure and pure relaxation.'

				return {
					...base,
					category,
					overline,
					description,
					includes: formatIncludes(' • '),
				}
			}

			case 'luxury-poster': {
				return { ...base, includes: formatIncludes(' • ') }
			}
			case 'promo-poster': {
				return {
					...base,
					promo_code: poster.promo_code || 'TRAVEL20',
					includes: formatIncludes(' • ')
				}
			}
			case 'nature-poster': {
				return { ...base, includes: formatIncludes(' • ') }
			}
			case 'culinary-poster': {
				return {
					...base,
					location: poster.location || 'Signature Dining',
					includes: formatIncludes(' • ')
				}
			}
			case 'city-poster': {
				return { ...base, includes: formatIncludes(' • ') }
			}
			case 'family-poster': {
				return { ...base, includes: formatIncludes(' • ') }
			}

			case 'collage-poster': {
				return {
					...base,
					promo_code: poster.promo_code || 'TRAVEL25',
					photo_1: poster.collageBuffers?.[1] ? `data:image/jpeg;base64,${poster.collageBuffers[1].toString('base64')}` : '',
					photo_2: poster.collageBuffers?.[2] ? `data:image/jpeg;base64,${poster.collageBuffers[2].toString('base64')}` : '',
					photo_3: poster.collageBuffers?.[3] ? `data:image/jpeg;base64,${poster.collageBuffers[3].toString('base64')}` : '',
				}
			}

			case 'poster': // brush-script
			default: {
				const destination = poster.headline
				const eyebrow = poster.subheadline?.slice(0, 30) || 'DREAM VACATION'

				return {
					...base,
					destination,
					eyebrow,
					includes: formatIncludes(' • '),
				}
			}
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
