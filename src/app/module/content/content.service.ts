import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import Product from '../product/product.model'
import Post from '../post/post.model'
import Campaign from '../campaign/campaign.model'
import User from '../user/user.model'
import { aiService } from '../ai/ai.service'
import { imageOverlayService, AspectRatio, PosterConfig } from '../image/image-overlay.service'
import { cloudinaryService } from '../cloudinary/cloudinary.service'
import { freepikService } from '../freepik/freepik.service'
import CalendarEntry from '../content-studio/calendar-entry.model'
import DesignTemplate, { PromptConfig } from '../content-studio/design-template.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { UPLOAD_DIR } from '../../config/upload.config'
import { logger } from '../../common/logger/logging'

const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed')
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })

type Intent = 'SELL' | 'VALUE' | 'ENGAGEMENT'
type JobStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface GenerateCarouselInput {
	product_id: string
	campaign_id?: string
	calendar_entry_id?: string
	platform: string
	slide_count?: number
	intent?: Intent
	aspect_ratio?: AspectRatio
	template_id?: string
}

interface GenerateReelInput {
	product_id: string
	campaign_id?: string
	calendar_entry_id?: string
	platform: string
	slide_duration?: number
	transition_duration?: number
}

interface Job {
	status: JobStatus
	result?: any
	error?: string
	started_at: Date
	completed_at?: Date
}

const TMP_DIR = path.join(os.tmpdir(), 'rayna-processing')
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

/** In-memory job store. Replace with Redis for multi-instance deployments. */
const jobStore = new Map<string, Job>()

/**
 * Resolve the correct aspect ratio based on platform + post type.
 * Instagram images/carousels → 4:5 portrait, stories/reels → 9:16 (use 4:5 since we don't support 9:16 yet),
 * Facebook → 4:5, Twitter/LinkedIn → 1.91:1 landscape.
 * Default: 4:5 portrait for everything.
 */
function resolveAspectRatio(platform?: string, postType?: string): AspectRatio {
	const p = (platform || '').toLowerCase()
	const t = (postType || '').toLowerCase()

	// Stories and reels are vertical — use 4:5 (closest supported portrait)
	if (t === 'story' || t === 'reel') return '4:5'

	// Twitter/X and LinkedIn prefer landscape for link cards
	if (p === 'twitter' || p === 'x' || p === 'linkedin') {
		if (t === 'carousel' || t === 'image') return '4:5' // carousels/images are still portrait
		return '1.91:1'
	}

	// Instagram & Facebook — always portrait for images and carousels
	return '4:5'
}

const LIFESTYLE_HUMAN_PROMPT = `Add a small woman seen from behind in the bottom-right corner of this image. She is sitting or standing, wearing a light dress and straw sun hat, looking at the view. Show only her upper body or half body. She should be small relative to the image — do NOT make her dominate the frame. CRITICAL: Do NOT change, add, remove, or modify ANYTHING else in the image — no new grass, no new ground, no new objects, no color changes, no background changes. The rest of the image must remain pixel-perfect identical. Only add the woman.`

function buildPosterData(
	entry: CalendarEntry,
	product?: Product,
): Record<string, string> {
	const meta = (product?.meta || {}) as Record<string, any>

	const entryDate = entry.date ? new Date(entry.date) : null
	const formattedDate = entryDate
		? `${entryDate.getDate()} ${entryDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}`
		: ''

	const durationShort = meta.duration_short || meta.nights
		? `${(meta.days || '')}D-${(meta.nights || '')}N`
		: ''

	let includes = ''
	if (product) {
		if (meta.includes) {
			includes = String(meta.includes)
		} else {
			includes = 'Stay | Breakfast | Tours | Transfers'
		}
	}

	return {
		destination: entry.title || '',
		headline: entry.title || '',
		subheadline: entry.description || '',
		tagline: meta.tagline || 'by your side',
		price: product ? `${product.currency} ${product.price}/-` : '',
		duration: durationShort,
		includes,
		dates: formattedDate + (durationShort ? ` | ${durationShort}` : ''),
		contact: meta.contact || '+971 4 208 7444 | +91 20 6683 8877',
		location: meta.location || 'Signature Dining',
		promo_code: meta.promo_code || 'TRAVEL25',
		brand_name: 'Rayna Tours',
	}
}

function buildDesignPrompt(
	promptConfig: PromptConfig,
	entry: CalendarEntry,
	product?: Product,
	additionalPrompt?: string,
): string {
	const replacements = buildPosterData(entry, product)

	let prompt = promptConfig.design_prompt
	for (const [key, value] of Object.entries(replacements)) {
		prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
	}

	if (additionalPrompt) prompt += `\n\nAdditional instructions: ${additionalPrompt}`

	return prompt
}

class ContentService {
	async generateCarousel(input: GenerateCarouselInput, authorId: string): Promise<IServiceResponse> {
		const product = await Product.findByPk(input.product_id)
		if (!product) throw new NotFoundError('Product not found')
		if (!product.image_urls || product.image_urls.length === 0) {
			throw new BadRequestError('Product has no images. Upload images first.')
		}

		const jobId = `cj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
		jobStore.set(jobId, { status: 'PROCESSING', started_at: new Date() })

		this.processCarousel(jobId, input, product, authorId).catch((err) => {
			logger.error(`Carousel job ${jobId} failed: ${err.message}`)
			jobStore.set(jobId, { status: 'FAILED', error: err.message, started_at: jobStore.get(jobId)!.started_at, completed_at: new Date() })
		})

		return {
			statusCode: 202,
			payload: { job_id: jobId, status: 'PROCESSING' },
			message: 'Carousel generation started. Poll GET /content/jobs/:id for result.',
		}
	}

	async generateReel(input: GenerateReelInput, authorId: string): Promise<IServiceResponse> {
		const product = await Product.findByPk(input.product_id)
		if (!product) throw new NotFoundError('Product not found')
		if (!product.image_urls || product.image_urls.length < 2) {
			throw new BadRequestError('Product needs at least 2 images for a reel.')
		}

		const jobId = `rj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
		jobStore.set(jobId, { status: 'PROCESSING', started_at: new Date() })

		this.processReel(jobId, input, product, authorId).catch((err) => {
			logger.error(`Reel job ${jobId} failed: ${err.message}`)
			jobStore.set(jobId, { status: 'FAILED', error: err.message, started_at: jobStore.get(jobId)!.started_at, completed_at: new Date() })
		})

		return {
			statusCode: 202,
			payload: { job_id: jobId, status: 'PROCESSING' },
			message: 'Reel generation started. Poll GET /content/jobs/:id for result.',
		}
	}

	getJobStatus(jobId: string): IServiceResponse {
		const job = jobStore.get(jobId)
		if (!job) throw new NotFoundError('Job not found')

		return {
			statusCode: 200,
			payload: {
				job_id: jobId,
				status: job.status,
				...(job.status === 'COMPLETED' && { result: job.result }),
				...(job.status === 'FAILED' && { error: job.error }),
				started_at: job.started_at,
				completed_at: job.completed_at || null,
			},
			message: job.status === 'PROCESSING' ? 'Still processing...' : `Job ${job.status.toLowerCase()}`,
		}
	}

	// ── Public: Process product images with overlays (used by content-studio compose) ──

	async processProductMedia(input: {
		product: Product
		platform: string
		slide_count?: number
		intent?: Intent
		aspect_ratio?: AspectRatio
		template_id?: string
	}): Promise<{ media_urls: string[]; ai_content: { caption: string; hashtags: string[]; cta: string } }> {
		const { product, platform, template_id } = input

		if (template_id) {
			const template = await DesignTemplate.findByPk(template_id)
			if (template) {
				return this.processAIGeneratedMedia({
					entry: { title: product.name, description: product.short_description, platform } as any,
					product,
					style: 'photo',
					num_images: input.slide_count,
					apply_overlay: true,
					aspect_ratio: input.aspect_ratio,
					template,
				})
			}
		}

		if (!product.image_urls?.length) throw new BadRequestError('Product has no images')

		const slideCount = Math.min(input.slide_count || product.image_urls.length, product.image_urls.length, 10)
		const intent = input.intent || this.classifyIntent(product)
		const priceLabel = `${product.currency} ${product.price}`

		const [aiContent, downloadedImages] = await Promise.all([
			aiService.generateCarouselContent({
				product_name: product.name,
				product_description: product.short_description || product.description,
				price: priceLabel,
				offer: product.offer_label || undefined,
				intent, platform,
				slide_count: slideCount,
			}),
			this.downloadAllImages(product.image_urls.slice(0, slideCount)),
		])

		const carouselData = aiContent.payload as {
			slides: Array<{ overlay_text: string; cta_text: string; subtitle?: string }>
			caption: string
			hashtags: string[]
			cta: string
		}

		const processedSlides = await this.processSlides(downloadedImages, carouselData.slides, {
			price: priceLabel, offerLabel: product.offer_label || undefined,
		}, input.aspect_ratio || 'auto')

		return {
			media_urls: processedSlides.map((s) => s.url),
			ai_content: { caption: carouselData.caption, hashtags: carouselData.hashtags, cta: carouselData.cta },
		}
	}

	// ── Private: Carousel Processing ─────────────────────────────────

	private async processCarousel(jobId: string, input: GenerateCarouselInput, product: Product, authorId: string) {
		const { campaign_id, platform, template_id } = input
		const slideCount = Math.min(input.slide_count || product.image_urls.length, product.image_urls.length, 10)
		const intent = input.intent || this.classifyIntent(product)
		const priceLabel = `${product.currency} ${product.price}`

		let finalMediaUrls: string[] = []
		let finalCaption: string = ''
		let finalHashtags: string[] = []
		let finalCta: string = ''
		let finalSlides: any[] = []

		if (template_id) {
			const template = await DesignTemplate.findByPk(template_id)
			if (template) {
				const res = await this.processAIGeneratedMedia({
					entry: { title: product.name, description: product.short_description, platform } as any,
					product,
					style: 'photo',
					num_images: input.slide_count || 4,
					apply_overlay: true,
					aspect_ratio: input.aspect_ratio,
					template,
				})
				finalMediaUrls = res.media_urls
				finalCaption = res.ai_content.caption
				finalHashtags = res.ai_content.hashtags
				finalCta = res.ai_content.cta
			}
		}

		if (finalMediaUrls.length === 0) {
			const [aiContent, downloadedImages] = await Promise.all([
				aiService.generateCarouselContent({
					product_name: product.name,
					product_description: product.short_description || product.description,
					price: priceLabel,
					offer: product.offer_label || undefined,
					intent, platform,
					slide_count: slideCount,
				}),
				this.downloadAllImages(product.image_urls.slice(0, slideCount)),
			])

			const carouselData = aiContent.payload as {
				slides: Array<{ overlay_text: string; cta_text: string; subtitle?: string }>
				caption: string
				hashtags: string[]
				cta: string
			}

			const processedSlides = await this.processSlides(downloadedImages, carouselData.slides, {
				price: priceLabel, offerLabel: product.offer_label || undefined,
			}, input.aspect_ratio || 'auto')

			finalMediaUrls = processedSlides.map((s) => s.url)
			finalCaption = carouselData.caption
			finalHashtags = carouselData.hashtags
			finalCta = carouselData.cta
			finalSlides = processedSlides
		}

		const post = await Post.create({
			calendar_entry_id: input.calendar_entry_id || null,
			campaign_id: campaign_id || null,
			author_id: authorId,
			base_content: finalCaption,
			hashtags: finalHashtags,
			cta_text: finalCta,
			platforms: [platform],
			media_urls: finalMediaUrls,
			status: 'DRAFT',
		} as any)

		const fullPost = await Post.findByPk(post.id, {
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal', 'type'], include: [{ model: Product, attributes: ['id', 'name', 'price', 'offer_label'] }] },
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})

		jobStore.set(jobId, {
			status: 'COMPLETED',
			result: {
				post: fullPost,
				slides: finalSlides,
				ai_content: { caption: finalCaption, hashtags: finalHashtags, cta: finalCta, slide_texts: finalSlides },
				meta: { product_id: product.id, product_name: product.name, intent, platform, slide_count: slideCount },
			},
			started_at: jobStore.get(jobId)!.started_at,
			completed_at: new Date(),
		})
		logger.info(`Carousel job ${jobId} completed`)
	}

	// ── Private: Reel Processing (Cloudinary does the heavy lifting) ─

	private async processReel(jobId: string, input: GenerateReelInput, product: Product, authorId: string) {
		const imageUrls = product.image_urls.slice(0, 10)

		// Upload all product images to Cloudinary (if not already there)
		const uploadedImages = await Promise.all(
			imageUrls.map((url, i) =>
				cloudinaryService.uploadUrl(url, {
					folder: `rayna/reels/${product.id}`,
					publicId: `slide-${i}`,
				})
			)
		)

		const publicIds = uploadedImages.map((r) => r.public_id)

		// Cloudinary creates the video — zero processing on our server
		const slideshow = await cloudinaryService.createSlideshow(publicIds, {
			publicId: `rayna/reels/${product.id}/reel-${Date.now()}`,
			slideDuration: input.slide_duration || 3,
			transitionDuration: input.transition_duration || 1,
		})

		// Cloudinary returns the video URL (may still be processing if async)
		const videoUrl = slideshow.secure_url || slideshow.url || null

		const post = await Post.create({
			calendar_entry_id: input.calendar_entry_id || null,
			campaign_id: input.campaign_id || null,
			author_id: authorId,
			base_content: `${product.name} — Reel`,
			platforms: [input.platform],
			media_urls: videoUrl ? [videoUrl] : [],
			status: 'DRAFT',
		} as any)

		const fullPost = await Post.findByPk(post.id, {
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal', 'type'] },
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})

		jobStore.set(jobId, {
			status: 'COMPLETED',
			result: {
				post: fullPost,
				video_url: videoUrl,
				public_id: slideshow.public_id,
				meta: { product_id: product.id, product_name: product.name, platform: input.platform, slide_count: imageUrls.length },
			},
			started_at: jobStore.get(jobId)!.started_at,
			completed_at: new Date(),
		})
		logger.info(`Reel job ${jobId} completed`)
	}

	// ── Private: Slide Processing ────────────────────────────────────

	private async processSlides(
		localPaths: string[],
		slideTexts: Array<{ overlay_text: string; cta_text: string; subtitle?: string }>,
		_pricing: { price: string; offerLabel?: string },
		aspectRatio: AspectRatio = 'auto'
	) {
		return Promise.all(
			localPaths.map(async (localPath, index) => {
				const slideText = slideTexts[index] || slideTexts[slideTexts.length - 1]
				const isFirstSlide = index === 0
				const isLastSlide = index === localPaths.length - 1
				const isEdgeSlide = isFirstSlide || isLastSlide

				const result = await imageOverlayService.processImage(localPath, {
					template: isEdgeSlide ? 'gradient-cta' : 'minimal-text',
					aspectRatio,
					title: slideText.overlay_text,
					subtitle: isEdgeSlide ? slideText.subtitle : undefined,
					ctaText: isEdgeSlide ? slideText.cta_text : undefined,
					accentColor: '#F97316',
				})

				let url: string
				let publicId: string | null = null

				if (cloudinaryService.enabled) {
					const uploaded = await cloudinaryService.uploadBuffer(result.buffer, { folder: 'rayna/carousel' })
					url = uploaded.secure_url
					publicId = uploaded.public_id
				} else {
					// Local fallback — save buffer to processed dir
					const fileName = `slide-${Date.now()}-${index}.jpeg`
					const destPath = path.join(PROCESSED_DIR, fileName)
					fs.writeFileSync(destPath, result.buffer)
					url = `/uploads/processed/${fileName}`
				}

				this.cleanup(localPath)

				return {
					public_id: publicId,
					url,
				}
			})
		)
	}

	// ── Public: Process stock media images with optional overlay + AI caption ──

	async processStockMedia(input: {
		image_urls: string[]
		entry: CalendarEntry
		apply_overlay: boolean
		generate_ai_caption: boolean
		aspect_ratio?: AspectRatio
	}): Promise<{ media_urls: string[]; ai_content?: { caption: string; hashtags: string[]; cta: string } }> {
		const { image_urls, entry, apply_overlay, generate_ai_caption } = input

		if (!image_urls.length) throw new BadRequestError('No stock image URLs provided')

		const downloadedImages = await this.downloadAllImages(image_urls)

		let mediaUrls: string[]

		if (apply_overlay) {
			// Generate minimal overlay texts from entry context
			const overlayTexts = downloadedImages.map((_, index) => ({
				overlay_text: index === 0 ? entry.title : '',
				cta_text: index === 0 || index === downloadedImages.length - 1 ? 'Book Now' : '',
				subtitle: index === 0 ? (entry.description?.slice(0, 60) || '') : undefined,
			}))

			const processedSlides = await this.processSlides(downloadedImages, overlayTexts, {
				price: '', offerLabel: undefined,
			}, input.aspect_ratio || 'auto')

			mediaUrls = processedSlides.map((s) => s.url)
		} else {
			// No overlay — just upload to Cloudinary directly
			mediaUrls = await Promise.all(
				downloadedImages.map(async (localPath, index) => {
					const buffer = fs.readFileSync(localPath)
					let url: string
					if (cloudinaryService.enabled) {
						const uploaded = await cloudinaryService.uploadBuffer(buffer, { folder: 'rayna/stock' })
						url = uploaded.secure_url
					} else {
						const fileName = `stock-${Date.now()}-${index}.jpeg`
						const destPath = path.join(PROCESSED_DIR, fileName)
						fs.writeFileSync(destPath, buffer)
						url = `/uploads/processed/${fileName}`
					}
					this.cleanup(localPath)
					return url
				})
			)
		}

		let aiContent: { caption: string; hashtags: string[]; cta: string } | undefined

		if (generate_ai_caption) {
			const result = await aiService.callOpenAIRaw<{ caption: string; hashtags: string[]; cta_text: string }>(`You are a social media copywriter for Rayna Tours, Dubai's top tours & activities company.

RESPOND WITH VALID JSON ONLY:
{"caption":"the full post caption","hashtags":["hashtag1","hashtag2"],"cta_text":"call to action"}

RULES:
- Platform: ${entry.platform}
- Content type: ${entry.content_type}
- Write an engaging, scroll-stopping caption
- 10-15 relevant hashtags
- Platform-appropriate CTA`, `Create post content for:
Title: ${entry.title}
Brief: ${entry.description || 'No specific brief'}
Platform: ${entry.platform} | Type: ${entry.content_type}
Note: Using stock/custom images, not product-specific content.`)

			aiContent = { caption: result.caption, hashtags: result.hashtags, cta: result.cta_text }
		}

		return { media_urls: mediaUrls, ai_content: aiContent }
	}

	// ── Public: Generate AI images via Freepik and process with overlay ──

	async processAIGeneratedMedia(input: {
		entry: CalendarEntry
		product?: Product
		style: 'photo' | 'digital-art' | '3d' | 'painting'
		additional_prompt?: string
		num_images?: number
		apply_overlay: boolean
		aspect_ratio?: AspectRatio
		template?: DesignTemplate
		poster_data?: Record<string, string>
	}): Promise<{ media_urls: string[]; ai_content: { caption: string; hashtags: string[]; cta: string } }> {
		const { entry, product, style, additional_prompt, apply_overlay, template, poster_data } = input

		// Build the image generation prompt — use design template if provided, otherwise fall back to generic
		let imagePrompt: string

		if (template) {
			imagePrompt = buildDesignPrompt(template.prompt_config, entry, product, additional_prompt)
		} else {
			imagePrompt = `Professional social media image for: ${entry.title}.`
			if (entry.description) imagePrompt += ` ${entry.description}.`
			if (product) imagePrompt += ` Product: ${product.name} — ${product.short_description || product.description || ''}.`
			imagePrompt += ` Professional National Geographic level travel photography. High contrast, vibrant colors, stunning cinematic lighting, 8k resolution, photorealistic masterpiece, award-winning composition, eye-catching and extremely attractive.`
			if (additional_prompt) imagePrompt += ` ${additional_prompt}`
		}

		let imageBuffers: Buffer[]

		// ── Always generate a fresh AI image via Freepik when a template is chosen ──
		// We never reuse the product photo as background — every render produces a new image.
		const aspectRatio = (input.aspect_ratio as AspectRatio) || resolveAspectRatio(entry.platform, entry.post_type)
		const sizeMap: Record<string, 'square_1_1' | 'portrait_3_4' | 'landscape_4_3'> = {
			'1:1': 'square_1_1',
			'4:5': 'portrait_3_4',
			'1.91:1': 'landscape_4_3',
		}
		const freepikSize = sizeMap[aspectRatio] || 'square_1_1'

		const slug = template?.slug?.toLowerCase() || ''
		const layout = (
			slug.startsWith('heritage') ? 'heritage' :
				slug.startsWith('lifestyle') ? 'lifestyle' :
					slug.startsWith('adventure') ? 'bold-adventure' :
						slug.startsWith('explorer') ? 'explorer' :
							slug.startsWith('luxury') ? 'luxury' :
								slug.startsWith('promo') ? 'promo' :
									slug.startsWith('nature') ? 'nature' :
										slug.startsWith('culinary') ? 'culinary' :
											slug.startsWith('city') ? 'city' :
												slug.startsWith('family') ? 'family' :
													slug.startsWith('collage') ? 'collage' : 'brush-script'
		) as any

		const effectiveNumImages = layout === 'collage' ? 4 : (input.num_images || 1)

		imageBuffers = await freepikService.generateAIImage({
			prompt: imagePrompt,
			style,
			size: freepikSize,
			num_images: effectiveNumImages,
		})

		if (template && imageBuffers.length > 0) {
			// Apply template overlay on top of the fresh AI image
			const data = poster_data || buildPosterData(entry, input.product)

			// For lifestyle-editorial: generate editorial copy via AI
			let lfSubheadline = data.subheadline
			let lfTagline = data.tagline
			if (slug.startsWith('lifestyle')) {
				try {
					const copy = await aiService.callOpenAIRaw<{ tagline: string; description: string }>(`You are a world-class travel copywriter at a FAANG-level social media agency. Write luxury editorial copy for a travel poster.

RESPOND WITH VALID JSON ONLY:
{"tagline":"short emotional subtitle — max 6 words, elegant, evocative","description":"2-3 short poetic lines about the destination experience — max 60 characters total, aspirational, editorial magazine tone"}

RULES:
- Tagline: dreamy, evocative, max 6 words (e.g. "Serenity, Shores & Island Magic" or "Where Dreams Meet the Horizon")
- Description: 2-3 short poetic lines, conversational luxury tone, max 60 chars (e.g. "From hidden gems\\nto iconic views,\\ndiscover unforgettable\\nmoments.")
- No hashtags, no emojis, no exclamation marks
- Think: Condé Nast Traveler, AFAR Magazine, Kinfolk editorial style`, `Destination: ${entry.title}\nBrief: ${entry.description || 'Premium travel experience'}\n${input.product ? `Product: ${input.product.name}` : ''}`)

					lfTagline = copy.tagline || lfTagline
					lfSubheadline = copy.description || lfSubheadline
				} catch (err: any) {
					logger.warn(`Lifestyle editorial copy generation failed: ${err.message}`)
				}
			}

			const posterConfig: PosterConfig = {
				brand_name: data.brand_name,
				headline: data.headline,
				subheadline: lfSubheadline,
				tagline: lfTagline,
				price: data.price,
				includes: data.includes,
				dates: data.dates,
				duration: data.duration,
				contact: data.contact,
				layout,
			}

			if (layout === 'collage' && imageBuffers.length >= 2) {
				const masterBuffer = await imageOverlayService.renderPoster(imageBuffers[0], {
					...posterConfig,
					collageBuffers: imageBuffers
				}, aspectRatio)
				imageBuffers = [masterBuffer]
			} else {
				imageBuffers = await Promise.all(imageBuffers.map(async (buf) =>
					imageOverlayService.renderPoster(buf, posterConfig, aspectRatio)
				))
			}
		}

		if (!imageBuffers.length) throw new BadRequestError('AI image generation returned no usable images')

		// Save buffers to temp files for processing
		const tempPaths = imageBuffers.map((buffer, i) => {
			const tempPath = path.join(os.tmpdir(), 'rayna-processing', `ai-gen-${Date.now()}-${i}.png`)
			fs.writeFileSync(tempPath, buffer)
			return tempPath
		})

		let mediaUrls: string[]

		if (apply_overlay) {
			const overlayTexts = tempPaths.map((_, index) => ({
				overlay_text: index === 0 ? entry.title : '',
				cta_text: index === 0 || index === tempPaths.length - 1 ? 'Book Now' : '',
				subtitle: index === 0 ? (entry.description?.slice(0, 60) || '') : undefined,
			}))

			const processedSlides = await this.processSlides(tempPaths, overlayTexts, {
				price: product ? `${product.currency} ${product.price}` : '',
				offerLabel: product?.offer_label || undefined,
			}, input.aspect_ratio || 'auto')

			mediaUrls = processedSlides.map((s) => s.url)
		} else {
			mediaUrls = await Promise.all(
				tempPaths.map(async (tempPath, index) => {
					const buffer = fs.readFileSync(tempPath)
					let url: string
					if (cloudinaryService.enabled) {
						const uploaded = await cloudinaryService.uploadBuffer(buffer, { folder: 'rayna/ai-generated' })
						url = uploaded.secure_url
					} else {
						const fileName = `ai-gen-${Date.now()}-${index}.png`
						const destPath = path.join(PROCESSED_DIR, fileName)
						fs.writeFileSync(destPath, buffer)
						url = `/uploads/processed/${fileName}`
					}
					this.cleanup(tempPath)
					return url
				})
			)
		}

		// Generate AI caption
		const captionResult = await aiService.callOpenAIRaw<{ caption: string; hashtags: string[]; cta_text: string }>(`You are a social media copywriter for Rayna Tours, Dubai's top tours & activities company.

RESPOND WITH VALID JSON ONLY:
{"caption":"the full post caption","hashtags":["hashtag1","hashtag2"],"cta_text":"call to action"}

RULES:
- Platform: ${entry.platform}
- Content type: ${entry.content_type}
- Write an engaging, scroll-stopping caption
- 10-15 relevant hashtags
- Platform-appropriate CTA
${product ? `- Product: ${product.name}, Price: ${product.currency} ${product.price}` : ''}`, `Create post content for:
Title: ${entry.title}
Brief: ${entry.description || 'No specific brief'}
${product ? `Product: ${product.name}` : ''}
Platform: ${entry.platform} | Type: ${entry.content_type}
Note: Using AI-generated imagery.`)

		return {
			media_urls: mediaUrls,
			ai_content: { caption: captionResult.caption, hashtags: captionResult.hashtags, cta: captionResult.cta_text },
		}
	}

	private classifyIntent(product: Product): Intent {
		if (product.offer_label || (product.compare_at_price && product.compare_at_price > product.price)) return 'SELL'
		if (product.highlights && product.highlights.length > 0) return 'VALUE'
		return 'ENGAGEMENT'
	}

	// ── Public: Apply design template to existing images via OpenAI image editing ──

	async applyDesignTemplate(input: {
		image_urls: string[]
		template: DesignTemplate
		entry: CalendarEntry
		product?: Product
		additional_prompt?: string
		poster_data?: Record<string, string>
	}): Promise<string[]> {
		const { image_urls, template, entry, product, poster_data } = input
		const data = poster_data || buildPosterData(entry, product)

		const slug = template.slug.toLowerCase()
		const layout = (slug.startsWith('heritage') ? 'heritage' :
			slug.startsWith('bold') ? 'bold-adventure' :
				slug.startsWith('explorer') ? 'explorer' :
					slug.startsWith('lifestyle') ? 'lifestyle' : 'brush-script') as any
		const aspectRatio = resolveAspectRatio(entry.platform, entry.post_type)

		// For lifestyle-editorial: generate a short editorial tagline + description via AI
		let lifestyleTagline = data.tagline
		let lifestyleDesc = data.subheadline
		if (template.slug === 'lifestyle-editorial') {
			try {
				const copy = await aiService.callOpenAIRaw<{ tagline: string; description: string }>(`You are a world-class travel copywriter at a FAANG-level social media agency. Write luxury editorial copy for a travel poster.

RESPOND WITH VALID JSON ONLY:
{"tagline":"short emotional subtitle — max 6 words, elegant, evocative","description":"2-3 short poetic lines about the destination experience — max 60 characters total, aspirational, editorial magazine tone"}

RULES:
- Tagline: dreamy, evocative, max 6 words (e.g. "Serenity, Shores & Island Magic" or "Where Dreams Meet the Horizon")
- Description: 2-3 short poetic lines, conversational luxury tone, max 60 chars (e.g. "From hidden gems\\nto iconic views,\\ndiscover unforgettable\\nmoments.")
- No hashtags, no emojis, no exclamation marks
- Think: Condé Nast Traveler, AFAR Magazine, Kinfolk editorial style`, `Destination: ${entry.title}\nBrief: ${entry.description || 'Premium travel experience'}\n${product ? `Product: ${product.name}` : ''}`)

				lifestyleTagline = copy.tagline || lifestyleTagline
				lifestyleDesc = copy.description || lifestyleDesc
			} catch (err: any) {
				logger.warn(`Lifestyle editorial copy generation failed, using defaults: ${err.message}`)
			}
		}

		const posterConfig = {
			brand_name: data.brand_name,
			headline: data.headline,
			subheadline: lifestyleDesc,
			tagline: lifestyleTagline,
			price: data.price,
			includes: data.includes,
			dates: data.dates,
			duration: data.duration,
			contact: data.contact,
			layout,
		}

		const resultUrls: string[] = []

		for (let i = 0; i < image_urls.length; i++) {
			const localPath = await this.downloadImage(image_urls[i], `template-src-${i}`)
			const imageBuffer = fs.readFileSync(localPath)
			this.cleanup(localPath)

			let edited: Buffer

			// Lifestyle Editorial: AI adds human FIRST on raw image, then overlay text on top
			if (template.slug === 'lifestyle-editorial') {
				console.log('>>> Lifestyle editorial: calling Flux Kontext Pro to add human traveler...')
				const enhanced = await aiService.editImage({
					imageBuffer,
					prompt: LIFESTYLE_HUMAN_PROMPT,
					model: 'flux-kontext',
				})
				console.log(`>>> Flux Kontext returned ${enhanced.length} image(s)`)
				const baseForOverlay = enhanced.length > 0 ? enhanced[0] : imageBuffer
				edited = await imageOverlayService.renderPoster(baseForOverlay, posterConfig, aspectRatio)
				console.log('>>> Lifestyle editorial: human element added + overlay applied')
			} else {
				edited = await imageOverlayService.renderPoster(imageBuffer, posterConfig, aspectRatio)
			}

			let url: string
			if (cloudinaryService.enabled) {
				const uploaded = await cloudinaryService.uploadBuffer(edited, { folder: 'rayna/designed-posters' })
				url = uploaded.secure_url
			} else {
				const fileName = `designed-poster-${Date.now()}-${i}.png`
				const destPath = path.join(PROCESSED_DIR, fileName)
				fs.writeFileSync(destPath, edited)
				url = `/uploads/processed/${fileName}`
			}
			resultUrls.push(url)
		}

		return resultUrls
	}

	private async downloadAllImages(imageUrls: string[]): Promise<string[]> {
		return Promise.all(imageUrls.map((url, i) => this.downloadImage(url, `slide-${i}`)))
	}

	private downloadImage(imageUrl: string, prefix: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const filePath = path.join(TMP_DIR, `${prefix}-${Date.now()}.jpeg`)
			const file = fs.createWriteStream(filePath)
			const client = imageUrl.startsWith('https') ? https : http

			client.get(imageUrl, (response) => {
				if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
					file.close()
					if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
					return resolve(this.downloadImage(response.headers.location, prefix))
				}
				response.pipe(file)
				file.on('finish', () => { file.close(); resolve(filePath) })
			}).on('error', (err) => {
				file.close()
				if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
				reject(new BadRequestError(`Failed to download image: ${err.message}`))
			})
		})
	}

	private cleanup(...paths: string[]) {
		for (const p of paths) {
			try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch { /* non-critical */ }
		}
	}
}

export const contentService = new ContentService()
