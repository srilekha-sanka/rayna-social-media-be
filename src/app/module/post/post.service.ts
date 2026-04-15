import { WhereOptions } from 'sequelize'
import Post from './post.model'
import Campaign from '../campaign/campaign.model'
import User from '../user/user.model'
import Product from '../product/product.model'
import SocialAccount from '../social-account/social-account.model'
import CalendarEntry from '../content-studio/calendar-entry.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { postForMeService } from '../postforme/postforme.service'
import { logger } from '../../common/logger/logging'

const POST_INCLUDES = [
	{
		model: Campaign,
		attributes: ['id', 'name', 'goal', 'type'],
		include: [{ model: Product, attributes: ['id', 'name', 'price', 'offer_label'] }],
	},
	{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
]

class PostService {
	async create(
		data: {
			campaign_id?: string
			base_content?: string
			hashtags?: string[]
			cta_text?: string
			platforms?: string[]
			media_urls?: string[]
			scheduled_at?: string
		},
		authorId: string
	): Promise<IServiceResponse> {
		const post = await Post.create({
			...data,
			scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
			author_id: authorId,
		} as any)

		const full = await Post.findByPk(post.id, { include: POST_INCLUDES })

		return { statusCode: 201, payload: full, message: 'Post created successfully' }
	}

	async findAll(query: {
		page: number
		limit: number
		campaign_id?: string
		status?: string
		platform?: string
	}): Promise<IServiceResponse> {
		const { page, limit, campaign_id, status } = query
		const offset = (page - 1) * limit

		const where: WhereOptions = { is_active: true }

		if (campaign_id) where.campaign_id = campaign_id
		if (status) where.status = status

		const { rows: posts, count: total } = await Post.findAndCountAll({
			where,
			limit,
			offset,
			order: [['createdAt', 'DESC']],
			include: POST_INCLUDES,
		})

		return {
			statusCode: 200,
			payload: {
				posts,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Posts fetched successfully',
		}
	}

	async findById(id: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id, { include: POST_INCLUDES })

		if (!post) {
			throw new NotFoundError('Post not found')
		}

		return { statusCode: 200, payload: post, message: 'Post fetched successfully' }
	}

	async update(id: string, data: Partial<Post>): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) {
			throw new NotFoundError('Post not found')
		}

		if (post.status === 'PUBLISHED') {
			throw new BadRequestError('Cannot update a published post')
		}

		await post.update(data)

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: 'Post updated successfully' }
	}

	/**
	 * Remove a single media item (slide) from a post's media_urls by index.
	 * Atomic operation — avoids full-array replacement race conditions.
	 */
	async removeMedia(postId: string, index: number): Promise<IServiceResponse> {
		const post = await Post.findByPk(postId)
		if (!post) throw new NotFoundError('Post not found')

		if (post.status === 'PUBLISHED') {
			throw new BadRequestError('Cannot modify media on a published post')
		}

		const urls = [...(post.media_urls || [])]
		if (index < 0 || index >= urls.length) {
			throw new BadRequestError(`Invalid media index ${index}. Post has ${urls.length} media item(s).`)
		}

		urls.splice(index, 1)
		await post.update({ media_urls: urls })

		const updated = await Post.findByPk(postId, { include: POST_INCLUDES })
		return { statusCode: 200, payload: updated, message: 'Media slide removed successfully' }
	}

	async delete(id: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) {
			throw new NotFoundError('Post not found')
		}

		await post.destroy()

		return { statusCode: 200, payload: null, message: 'Post deleted successfully' }
	}

	/**
	 * Submit post for admin review.
	 * DRAFT → PENDING_REVIEW
	 */
	async submitForReview(id: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'DRAFT') {
			throw new BadRequestError(`Cannot submit for review — post is currently '${post.status}'. Only DRAFT posts can be submitted.`)
		}

		await post.update({ status: 'PENDING_REVIEW' })

		if (post.calendar_entry_id) {
			await CalendarEntry.update({ status: 'IN_REVIEW' }, { where: { id: post.calendar_entry_id } })
		}

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: 'Post submitted for review' }
	}

	/**
	 * Admin approves the post.
	 * PENDING_REVIEW → APPROVED
	 */
	async approve(id: string, adminId: string, note?: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'PENDING_REVIEW') {
			throw new BadRequestError(`Cannot approve — post is currently '${post.status}'. Only PENDING_REVIEW posts can be approved.`)
		}

		await post.update({
			status: 'APPROVED',
			approved_by: adminId,
			approval_note: note || null,
			rejection_reason: null,
		})

		if (post.calendar_entry_id) {
			await CalendarEntry.update({ status: 'READY' }, { where: { id: post.calendar_entry_id } })
		}

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: 'Post approved' }
	}

	/**
	 * Admin rejects the post with a reason.
	 * PENDING_REVIEW → DRAFT (so creator can edit and resubmit)
	 */
	async reject(id: string, adminId: string, reason: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'PENDING_REVIEW') {
			throw new BadRequestError(`Cannot reject — post is currently '${post.status}'. Only PENDING_REVIEW posts can be rejected.`)
		}

		if (!reason || !reason.trim()) {
			throw new BadRequestError('Rejection reason is required')
		}

		await post.update({
			status: 'DRAFT',
			approved_by: adminId,
			rejection_reason: reason.trim(),
		})

		if (post.calendar_entry_id) {
			await CalendarEntry.update({ status: 'COMPOSING' }, { where: { id: post.calendar_entry_id } })
		}

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: 'Post rejected — returned to draft' }
	}

	/**
	 * Publish an approved post to all target platforms via PostForMe.
	 * APPROVED → PUBLISHING → PUBLISHED / FAILED
	 */
	async publish(id: string, userId: string, socialAccountIds: string[]): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'APPROVED') {
			throw new BadRequestError(`Cannot publish — post is currently '${post.status}'. Only APPROVED posts can be published.`)
		}

		await post.update({ status: 'PUBLISHING' })

		try {
			const pfmResult = await this.publishViaPostForMe(post, undefined, socialAccountIds)

			await post.update({
				status: 'PUBLISHED',
				published_at: new Date(),
				postforme_post_id: pfmResult.id,
			})

			if (post.calendar_entry_id) {
				await CalendarEntry.update({ status: 'PUBLISHED' }, { where: { id: post.calendar_entry_id } })
			}

			const updated = await Post.findByPk(id, { include: POST_INCLUDES })

			return { statusCode: 200, payload: updated, message: 'Post published successfully' }
		} catch (err: any) {
			await post.update({ status: 'FAILED' })
			logger.error(`Failed to publish post ${id}: ${err.message}`)
			throw new BadRequestError(`Publishing failed: ${err.message}`)
		}
	}

	/**
	 * Schedule an approved post for future publishing via PostForMe.
	 * APPROVED → SCHEDULED
	 */
	async schedule(id: string, scheduledAt: string, socialAccountIds: string[]): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'APPROVED') {
			throw new BadRequestError(`Cannot schedule — post is currently '${post.status}'. Only APPROVED posts can be scheduled.`)
		}

		const scheduleDate = new Date(scheduledAt)

		if (scheduleDate <= new Date()) {
			throw new BadRequestError('scheduled_at must be a future date')
		}

		try {
			// Create the post on PostForMe with scheduled_at — PFM handles the scheduling
			const pfmResult = await this.publishViaPostForMe(post, scheduleDate.toISOString(), socialAccountIds)

			await post.update({
				status: 'SCHEDULED',
				scheduled_at: scheduleDate,
				postforme_post_id: pfmResult.id,
			})

			if (post.calendar_entry_id) {
				await CalendarEntry.update({ status: 'SCHEDULED' }, { where: { id: post.calendar_entry_id } })
			}

			const updated = await Post.findByPk(id, { include: POST_INCLUDES })

			return { statusCode: 200, payload: updated, message: `Post scheduled for ${scheduleDate.toISOString()}` }
		} catch (err: any) {
			logger.error(`Failed to schedule post ${id}: ${err.message}`)
			throw new BadRequestError(`Scheduling failed: ${err.message}`)
		}
	}

	// ── Private Helpers ──────────────────────────────────────────────

	/**
	 * Resolve PostForMe social_account IDs from explicit account selection.
	 * No fallback — caller MUST specify which accounts to post to.
	 */
	private async resolvePFMAccountIds(socialAccountIds: string[]): Promise<string[]> {
		const accounts = await SocialAccount.findAll({
			where: {
				id: socialAccountIds,
				status: 'CONNECTED',
				is_active: true,
			},
		})

		if (accounts.length !== socialAccountIds.length) {
			const foundIds = accounts.map((a) => a.id)
			const missing = socialAccountIds.filter((id) => !foundIds.includes(id))
			throw new BadRequestError(`Social account(s) not found or not connected: ${missing.join(', ')}`)
		}

		const pfmIds = accounts
			.filter((a) => a.postforme_account_id)
			.map((a) => a.postforme_account_id!)

		if (!pfmIds.length) {
			throw new BadRequestError('None of the selected social accounts are linked to PostForMe.')
		}

		return pfmIds
	}

	/**
	 * Build caption from post content + hashtags.
	 */
	private buildCaption(post: Post): string {
		const parts: string[] = []

		if (post.base_content) parts.push(post.base_content)

		if (post.hashtags?.length) {
			const tags = post.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
			parts.push(tags)
		}

		return parts.join('\n\n')
	}

	/**
	 * Publish (or schedule) a post via PostForMe's unified API.
	 */
	private async publishViaPostForMe(post: Post, scheduledAt?: string, socialAccountIds?: string[]) {
		if (!socialAccountIds?.length) {
			throw new BadRequestError('No social accounts specified. Select at least one account to publish to.')
		}

		const pfmAccountIds = await this.resolvePFMAccountIds(socialAccountIds)
		const caption = this.buildCaption(post)

		const media = (post.media_urls || []).map((url) => ({ url }))

		return postForMeService.createPost({
			caption,
			social_accounts: pfmAccountIds,
			scheduled_at: scheduledAt || null,
			media: media.length ? media : undefined,
			external_id: post.id,
		})
	}
}

export const postService = new PostService()
