import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import Product from '../product/product.model'
import Post from '../post/post.model'
import Campaign from '../campaign/campaign.model'
import User from '../user/user.model'
import { aiService } from '../ai/ai.service'
import { imageOverlayService } from '../image/image-overlay.service'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { UPLOAD_DIR } from '../../config/upload.config'
import { logger } from '../../common/logger/logging'

type Intent = 'SELL' | 'VALUE' | 'ENGAGEMENT'

type JobStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface GenerateCarouselInput {
	product_id: string
	campaign_id?: string
	platform: string
	slide_count?: number
	intent?: Intent
}

interface CarouselJob {
	status: JobStatus
	result?: any
	error?: string
	started_at: Date
	completed_at?: Date
}

const DOWNLOADS_DIR = path.join(UPLOAD_DIR, 'downloads')

const ensureDir = (dir: string) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}
}

ensureDir(DOWNLOADS_DIR)

/** In-memory job store. Replace with Redis for multi-instance deployments. */
const jobStore = new Map<string, CarouselJob>()

class ContentService {
	/**
	 * Async carousel generator — returns job_id immediately (~100ms).
	 * Processing happens in background. Poll GET /content/jobs/:id for result.
	 */
	async generateCarousel(input: GenerateCarouselInput, authorId: string): Promise<IServiceResponse> {
		const { product_id } = input

		const product = await Product.findByPk(product_id)
		if (!product) throw new NotFoundError('Product not found')
		if (!product.image_urls || product.image_urls.length === 0) {
			throw new BadRequestError('Product has no images. Upload images first.')
		}

		const jobId = `cj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

		jobStore.set(jobId, { status: 'PROCESSING', started_at: new Date() })

		// Fire and forget — process in background
		this.processCarousel(jobId, input, product, authorId).catch((err) => {
			logger.error(`Carousel job ${jobId} failed: ${err.message}`)
			jobStore.set(jobId, {
				status: 'FAILED',
				error: err.message,
				started_at: jobStore.get(jobId)!.started_at,
				completed_at: new Date(),
			})
		})

		return {
			statusCode: 202,
			payload: { job_id: jobId, status: 'PROCESSING' },
			message: 'Carousel generation started. Poll GET /content/jobs/:id for result.',
		}
	}

	/**
	 * Poll job status.
	 */
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

	/**
	 * Background processor — does the heavy lifting.
	 */
	private async processCarousel(
		jobId: string,
		input: GenerateCarouselInput,
		product: Product,
		authorId: string
	) {
		const { campaign_id, platform } = input
		const slideCount = Math.min(input.slide_count || product.image_urls.length, product.image_urls.length, 10)
		const intent = input.intent || this.classifyIntent(product)
		const priceLabel = `${product.currency} ${product.price}`

		// Run AI generation + image download in parallel
		const [aiContent, downloadedImages] = await Promise.all([
			aiService.generateCarouselContent({
				product_name: product.name,
				product_description: product.short_description || product.description,
				price: priceLabel,
				offer: product.offer_label || undefined,
				intent,
				platform,
				slide_count: slideCount,
			}),
			this.downloadAllImages(product.image_urls.slice(0, slideCount)),
		])

		const carouselData = aiContent.payload as {
			slides: Array<{ overlay_text: string; cta_text: string }>
			caption: string
			hashtags: string[]
			cta: string
		}

		// Process overlays (resize + text) — all slides in parallel
		const processedSlides = await this.processSlides(downloadedImages, carouselData.slides, {
			price: priceLabel,
			offerLabel: product.offer_label || undefined,
		})

		// Create DRAFT post
		const mediaUrls = processedSlides.map((s) => s.url)

		const post = await Post.create({
			campaign_id: campaign_id || null,
			author_id: authorId,
			base_content: carouselData.caption,
			hashtags: carouselData.hashtags,
			cta_text: carouselData.cta,
			platforms: [platform],
			media_urls: mediaUrls,
			status: 'DRAFT',
		} as any)

		const fullPost = await Post.findByPk(post.id, {
			include: [
				{
					model: Campaign,
					attributes: ['id', 'name', 'goal', 'type'],
					include: [{ model: Product, attributes: ['id', 'name', 'price', 'offer_label'] }],
				},
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})

		// Mark job as completed
		jobStore.set(jobId, {
			status: 'COMPLETED',
			result: {
				post: fullPost,
				slides: processedSlides,
				ai_content: {
					caption: carouselData.caption,
					hashtags: carouselData.hashtags,
					cta: carouselData.cta,
					slide_texts: carouselData.slides,
				},
				meta: { product_id: product.id, product_name: product.name, intent, platform, slide_count: slideCount },
			},
			started_at: jobStore.get(jobId)!.started_at,
			completed_at: new Date(),
		})

		logger.info(`Carousel job ${jobId} completed`)
	}

	/**
	 * Build overlays for content slides (first + middle).
	 * Single centered text — clean, no clutter.
	 */
	private buildContentSlideOverlays(text: string) {
		return [
			{
				text,
				position: 'center' as const,
				fontSize: 42,
				fontColor: '#FFFFFF',
				backgroundColor: 'rgba(0,0,0,0.55)',
				padding: 24,
			},
		]
	}

	/**
	 * Build overlays for the last slide.
	 * Price badge (top-right) + offer badge (top-left) + CTA banner (bottom).
	 * NO center text — avoids duplication.
	 */
	private buildLastSlideOverlays(
		ctaText: string,
		pricing: { price: string; offerLabel?: string }
	) {
		const overlays: Array<{
			text: string
			position: 'top-left' | 'top-right' | 'bottom-center'
			fontSize: number
			fontColor: string
			backgroundColor: string
			padding: number
		}> = []

		if (pricing.price) {
			overlays.push({
				text: pricing.price,
				position: 'top-right',
				fontSize: 36,
				fontColor: '#FFFFFF',
				backgroundColor: '#E53E3E',
				padding: 14,
			})
		}

		if (pricing.offerLabel) {
			overlays.push({
				text: pricing.offerLabel,
				position: 'top-left',
				fontSize: 24,
				fontColor: '#FFFFFF',
				backgroundColor: '#38A169',
				padding: 12,
			})
		}

		if (ctaText) {
			overlays.push({
				text: ctaText,
				position: 'bottom-center',
				fontSize: 30,
				fontColor: '#FFFFFF',
				backgroundColor: 'rgba(0,0,0,0.8)',
				padding: 16,
			})
		}

		return overlays
	}

	/**
	 * Decision Engine — Intent Classification
	 * From scope doc: if (offer) → SELL, else if (USP/highlights) → VALUE, else → ENGAGEMENT
	 */
	private classifyIntent(product: Product): Intent {
		if (product.offer_label || (product.compare_at_price && product.compare_at_price > product.price)) {
			return 'SELL'
		}

		if (product.highlights && product.highlights.length > 0) {
			return 'VALUE'
		}

		return 'ENGAGEMENT'
	}

	/**
	 * Download all images in parallel.
	 */
	private async downloadAllImages(imageUrls: string[]): Promise<string[]> {
		return Promise.all(imageUrls.map((url, i) => this.downloadImage(url, `slide-${i}`)))
	}

	/**
	 * Resize + apply overlays to pre-downloaded images. All slides processed in parallel.
	 *
	 * Single content strategy per slide — NO duplication:
	 * - First + middle slides: center hook/feature text only
	 * - Last slide: price badge + offer badge + CTA banner — NO center text
	 */
	private async processSlides(
		localPaths: string[],
		slideTexts: Array<{ overlay_text: string; cta_text: string }>,
		pricing: { price: string; offerLabel?: string }
	) {
		const results = await Promise.all(
			localPaths.map(async (localPath, index) => {
				const slideText = slideTexts[index] || slideTexts[slideTexts.length - 1]
				const isLastSlide = index === localPaths.length - 1

				const resizedPath = path.join(DOWNLOADS_DIR, `resized-${Date.now()}-${index}.jpeg`)
				await sharp(localPath)
					.resize(1080, 1080, { fit: 'cover', position: 'center' })
					.jpeg({ quality: 90 })
					.toFile(resizedPath)

				const overlays = isLastSlide
					? this.buildLastSlideOverlays(slideText.cta_text, pricing)
					: this.buildContentSlideOverlays(slideText.overlay_text)

				const overlayPath = await imageOverlayService.applyOverlay({
					imagePath: resizedPath,
					overlays,
				})

				const url = `/uploads/processed/${path.basename(overlayPath)}`

				this.cleanupFile(localPath)
				this.cleanupFile(resizedPath)

				return {
					slide_number: index + 1,
					processed_image: overlayPath,
					url,
					overlay_text: isLastSlide ? null : slideText.overlay_text,
					cta_text: isLastSlide ? slideText.cta_text : null,
				}
			})
		)

		return results
	}

	/**
	 * Download a remote image to local disk.
	 */
	private downloadImage(imageUrl: string, prefix: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const ext = '.jpeg'
			const fileName = `${prefix}-${Date.now()}${ext}`
			const filePath = path.join(DOWNLOADS_DIR, fileName)
			const file = fs.createWriteStream(filePath)

			const client = imageUrl.startsWith('https') ? https : http

			client
				.get(imageUrl, (response) => {
					// Handle redirects
					if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
						file.close()
						fs.unlinkSync(filePath)
						return resolve(this.downloadImage(response.headers.location, prefix))
					}

					response.pipe(file)

					file.on('finish', () => {
						file.close()
						resolve(filePath)
					})
				})
				.on('error', (err) => {
					file.close()
					fs.unlinkSync(filePath)
					reject(new BadRequestError(`Failed to download image: ${err.message}`))
				})
		})
	}

	private cleanupFile(filePath: string) {
		try {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
		} catch {
			// non-critical — skip
		}
	}
}

export const contentService = new ContentService()
