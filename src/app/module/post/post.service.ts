import { WhereOptions } from 'sequelize'
import Post from './post.model'
import Campaign from '../campaign/campaign.model'
import User from '../user/user.model'
import Product from '../product/product.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'

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

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: 'Post rejected — returned to draft' }
	}

	/**
	 * Publish an approved post.
	 * APPROVED → PUBLISHING → (webhook confirms) → PUBLISHED
	 * For now: marks as PUBLISHED. Outstand.so integration will handle actual platform publishing.
	 */
	async publish(id: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'APPROVED') {
			throw new BadRequestError(`Cannot publish — post is currently '${post.status}'. Only APPROVED posts can be published.`)
		}

		// TODO: Call Outstand.so API to publish to platforms
		// For now, mark as PUBLISHED directly
		await post.update({
			status: 'PUBLISHED',
			published_at: new Date(),
		})

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: 'Post published successfully' }
	}

	/**
	 * Schedule an approved post for future publishing.
	 * APPROVED → SCHEDULED
	 */
	async schedule(id: string, scheduledAt: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(id)

		if (!post) throw new NotFoundError('Post not found')

		if (post.status !== 'APPROVED') {
			throw new BadRequestError(`Cannot schedule — post is currently '${post.status}'. Only APPROVED posts can be scheduled.`)
		}

		const scheduleDate = new Date(scheduledAt)

		if (scheduleDate <= new Date()) {
			throw new BadRequestError('scheduled_at must be a future date')
		}

		await post.update({
			status: 'SCHEDULED',
			scheduled_at: scheduleDate,
		})

		const updated = await Post.findByPk(id, { include: POST_INCLUDES })

		return { statusCode: 200, payload: updated, message: `Post scheduled for ${scheduleDate.toISOString()}` }
	}
}

export const postService = new PostService()
