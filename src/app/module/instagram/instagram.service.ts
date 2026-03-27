import Post from '../post/post.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { env } from '../../../db/config/env.config'

const IG_API_BASE = 'https://graph.facebook.com/v21.0'

class InstagramService {
	private resolveCredentials(): { access_token: string; ig_user_id: string } {
		if (!env.instagram.appId || !env.instagram.appSecret) {
			throw new BadRequestError('Instagram credentials not configured. Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in .env')
		}
		return { ig_user_id: env.instagram.appId, access_token: env.instagram.appSecret }
	}

	// ─── Publish ───────────────────────────────────────────────

	async publish(
		data: { image_url?: string; video_url?: string; caption: string; media_type: string },
		userId: string
	): Promise<IServiceResponse> {
		const { access_token, ig_user_id } = this.resolveCredentials()
		const { caption, media_type, image_url, video_url } = data

		const containerParams = new URLSearchParams({ caption, access_token })

		if (media_type === 'IMAGE') {
			containerParams.set('image_url', image_url!)
		} else {
			containerParams.set('video_url', video_url!)
			containerParams.set('media_type', 'REELS')
		}

		const containerRes = await fetch(`${IG_API_BASE}/${ig_user_id}/media`, {
			method: 'POST',
			body: containerParams,
		})
		const containerData: any = await containerRes.json()

		if (containerData.error) {
			throw new BadRequestError(`Instagram API error: ${containerData.error.message}`)
		}

		const creationId = containerData.id

		if (media_type === 'VIDEO' || media_type === 'REELS') {
			await this.waitForVideoProcessing(creationId, access_token)
		}

		const publishRes = await fetch(`${IG_API_BASE}/${ig_user_id}/media_publish`, {
			method: 'POST',
			body: new URLSearchParams({ creation_id: creationId, access_token }),
		})
		const publishData: any = await publishRes.json()

		if (publishData.error) {
			throw new BadRequestError(`Instagram publish error: ${publishData.error.message}`)
		}

		return {
			statusCode: 201,
			payload: { media_id: publishData.id, media_type, caption },
			message: 'Post published to Instagram successfully',
		}
	}

	async publishPost(postId: string, userId: string): Promise<IServiceResponse> {
		const { access_token, ig_user_id } = this.resolveCredentials()

		const post = await Post.findByPk(postId)
		if (!post) throw new NotFoundError('Post not found')

		if (!post.media_urls || post.media_urls.length === 0) {
			throw new BadRequestError('Post has no media URLs to publish')
		}

		const caption = [post.base_content || '', ...(post.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`))].filter(Boolean).join('\n\n')

		let publishResult: any

		if (post.media_urls.length === 1) {
			const result = await this.publish({ image_url: post.media_urls[0], caption, media_type: 'IMAGE' }, userId)
			publishResult = result.payload
		} else {
			publishResult = await this.publishCarousel(post.media_urls, caption, access_token, ig_user_id)
		}

		await post.update({ status: 'PUBLISHED', published_at: new Date() })

		return {
			statusCode: 201,
			payload: publishResult,
			message: 'Post published to Instagram and status updated',
		}
	}

	private async publishCarousel(
		mediaUrls: string[],
		caption: string,
		accessToken: string,
		igUserId: string
	): Promise<{ media_id: string; media_type: string; caption: string }> {
		const childIds: string[] = []

		for (const imageUrl of mediaUrls) {
			const childRes = await fetch(`${IG_API_BASE}/${igUserId}/media`, {
				method: 'POST',
				body: new URLSearchParams({ image_url: imageUrl, is_carousel_item: 'true', access_token: accessToken }),
			})
			const childData: any = await childRes.json()

			if (childData.error) {
				throw new BadRequestError(`Instagram carousel child error: ${childData.error.message}`)
			}
			childIds.push(childData.id)
		}

		const carouselParams = new URLSearchParams({ caption, media_type: 'CAROUSEL', access_token: accessToken })
		carouselParams.set('children', childIds.join(','))

		const carouselRes = await fetch(`${IG_API_BASE}/${igUserId}/media`, { method: 'POST', body: carouselParams })
		const carouselData: any = await carouselRes.json()

		if (carouselData.error) {
			throw new BadRequestError(`Instagram carousel error: ${carouselData.error.message}`)
		}

		const publishRes = await fetch(`${IG_API_BASE}/${igUserId}/media_publish`, {
			method: 'POST',
			body: new URLSearchParams({ creation_id: carouselData.id, access_token: accessToken }),
		})
		const publishData: any = await publishRes.json()

		if (publishData.error) {
			throw new BadRequestError(`Instagram carousel publish error: ${publishData.error.message}`)
		}

		return { media_id: publishData.id, media_type: 'CAROUSEL', caption }
	}

	// ─── Media Feed ────────────────────────────────────────────

	async getMedia(userId: string, limit: number = 20): Promise<IServiceResponse> {
		const { access_token, ig_user_id } = this.resolveCredentials()

		const mediaRes = await fetch(
			`${IG_API_BASE}/${ig_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=${limit}&access_token=${access_token}`
		)
		const mediaData: any = await mediaRes.json()

		if (mediaData.error) {
			throw new BadRequestError(`Instagram API error: ${mediaData.error.message}`)
		}

		return { statusCode: 200, payload: mediaData, message: 'Instagram media fetched successfully' }
	}

	// ─── Helpers ───────────────────────────────────────────────

	private async waitForVideoProcessing(creationId: string, accessToken: string): Promise<void> {
		const maxAttempts = 30
		let attempts = 0

		while (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 10000))
			attempts++

			const statusRes = await fetch(`${IG_API_BASE}/${creationId}?fields=status_code&access_token=${accessToken}`)
			const statusData: any = await statusRes.json()

			if (statusData.status_code === 'FINISHED') return
			if (statusData.status_code === 'ERROR') {
				throw new BadRequestError('Video processing failed on Instagram')
			}
		}

		throw new BadRequestError('Video processing timed out (exceeded 5 minutes)')
	}
}

export const instagramService = new InstagramService()
