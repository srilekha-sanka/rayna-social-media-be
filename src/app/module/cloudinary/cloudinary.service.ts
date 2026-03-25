import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { env } from '../../../db/config/env.config'
import { logger } from '../../common/logger/logging'
import { Readable } from 'stream'

const isConfigured = !!(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret)

if (isConfigured) {
	cloudinary.config({
		cloud_name: env.cloudinary.cloudName,
		api_key: env.cloudinary.apiKey,
		api_secret: env.cloudinary.apiSecret,
		secure: true,
	})
}

class CloudinaryService {
	/** Check if Cloudinary is configured. */
	get enabled(): boolean {
		return isConfigured
	}

	/** Upload a local file (image/video). */
	async upload(filePath: string, options?: { folder?: string; publicId?: string; resourceType?: 'image' | 'video' | 'raw' }): Promise<UploadApiResponse> {
		if (!isConfigured) throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env')

		return cloudinary.uploader.upload(filePath, {
			folder: options?.folder || 'rayna',
			public_id: options?.publicId,
			resource_type: options?.resourceType || 'auto',
			overwrite: true,
		})
	}

	/** Upload from a buffer (e.g. multer memoryStorage or sharp output). */
	async uploadBuffer(buffer: Buffer, options?: { folder?: string; publicId?: string; resourceType?: 'image' | 'video' | 'raw' }): Promise<UploadApiResponse> {
		if (!isConfigured) throw new Error('Cloudinary is not configured.')

		return new Promise((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					folder: options?.folder || 'rayna',
					public_id: options?.publicId,
					resource_type: options?.resourceType || 'auto',
					overwrite: true,
				},
				(err, result) => {
					if (err || !result) return reject(err || new Error('Upload failed'))
					resolve(result)
				}
			)
			Readable.from(buffer).pipe(stream)
		})
	}

	/** Upload from a remote URL. */
	async uploadUrl(url: string, options?: { folder?: string; publicId?: string }): Promise<UploadApiResponse> {
		if (!isConfigured) throw new Error('Cloudinary is not configured.')

		return cloudinary.uploader.upload(url, {
			folder: options?.folder || 'rayna',
			public_id: options?.publicId,
			resource_type: 'auto',
		})
	}

	/** Delete by public_id. */
	async delete(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
		if (!isConfigured) return

		await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true })
	}

	/** Generate a transformation URL (no upload — just URL math). */
	url(publicId: string, transforms: Record<string, any>[]): string {
		return cloudinary.url(publicId, { transformation: transforms, secure: true })
	}

	/**
	 * Create a slideshow video from uploaded images.
	 * Cloudinary processes this on their infra — your EC2 does zero video work.
	 */
	async createSlideshow(
		imagePublicIds: string[],
		options: { publicId?: string; slideDuration?: number; transitionDuration?: number; width?: number; height?: number; notificationUrl?: string }
	): Promise<any> {
		if (!isConfigured) throw new Error('Cloudinary is not configured.')

		const slideDur = (options.slideDuration || 3) * 1000
		const transDur = (options.transitionDuration || 1) * 1000
		const totalDur = imagePublicIds.length * (options.slideDuration || 3)
		const w = options.width || 1080
		const h = options.height || 1080

		return cloudinary.uploader.create_slideshow({
			manifest_json: JSON.stringify({
				w, h,
				du: totalDur,
				fps: 30,
				vars: { sdur: slideDur, tdur: transDur },
				slides: imagePublicIds.map((id) => ({ media: `i:${id}` })),
			}),
			resource_type: 'video',
			public_id: options.publicId || `rayna/videos/slideshow-${Date.now()}`,
			notification_url: options.notificationUrl,
			overwrite: true,
		} as any)
	}

	/**
	 * Upload an image and apply Generative Fill to extend it to target aspect ratio.
	 * Cloudinary AI fills the extended areas with contextually appropriate content.
	 * Perfect for converting landscape images to portrait (4:5) for Instagram.
	 */
	async generativeFill(
		source: string | Buffer,
		options: { folder?: string; aspectRatio?: string; width?: number; height?: number }
	): Promise<UploadApiResponse> {
		if (!isConfigured) throw new Error('Cloudinary is not configured.')

		const ar = options.aspectRatio || '4:5'
		const w = options.width || 1080
		const h = options.height || 1350

		// Upload the source first, then apply eager transformation with gen_fill
		const uploadOptions: Record<string, any> = {
			folder: options.folder || 'rayna/carousel',
			resource_type: 'image',
			overwrite: true,
			eager: [
				{
					width: w,
					height: h,
					crop: 'pad',
					aspect_ratio: ar,
					background: 'gen_fill',
				},
			],
			eager_async: false,
		}

		if (Buffer.isBuffer(source)) {
			return new Promise((resolve, reject) => {
				const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
					if (err || !result) return reject(err || new Error('Generative fill upload failed'))
					resolve(result)
				})
				Readable.from(source).pipe(stream)
			})
		}

		// String source — file path or URL
		return cloudinary.uploader.upload(source, uploadOptions)
	}

	/** Get the eager transformation URL from an upload result. */
	getEagerUrl(result: UploadApiResponse): string {
		if (result.eager && result.eager.length > 0) {
			return result.eager[0].secure_url || result.eager[0].url
		}
		return result.secure_url || result.url
	}

	/** Verify Cloudinary webhook signature. */
	verifyWebhook(body: string, timestamp: number, signature: string): boolean {
		try {
			return cloudinary.utils.verifyNotificationSignature(body, timestamp, signature)
		} catch (err: any) {
			logger.error(`Cloudinary webhook verification failed: ${err.message}`)
			return false
		}
	}
}

export const cloudinaryService = new CloudinaryService()
