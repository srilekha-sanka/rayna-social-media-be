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
}

export const postService = new PostService()
