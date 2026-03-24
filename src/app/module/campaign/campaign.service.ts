import { WhereOptions } from 'sequelize'
import Campaign from './campaign.model'
import Product from '../product/product.model'
import User from '../user/user.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError } from '../../errors/api-errors'

class CampaignService {
	async create(
		data: {
			name: string
			type: string
			goal: 'SELL' | 'VALUE' | 'ENGAGEMENT'
			target_audience?: object
			start_date?: string
			end_date?: string
			product_id?: string
		},
		createdBy: string
	): Promise<IServiceResponse> {
		const campaign = await Campaign.create({
			...data,
			start_date: data.start_date ? new Date(data.start_date) : undefined,
			end_date: data.end_date ? new Date(data.end_date) : undefined,
			created_by: createdBy,
		} as any)

		const full = await Campaign.findByPk(campaign.id, {
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls'] },
				{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] },
			],
		})

		return { statusCode: 201, payload: full, message: 'Campaign created successfully' }
	}

	async findAll(query: {
		page: number
		limit: number
		status?: string
		goal?: string
	}): Promise<IServiceResponse> {
		const { page, limit, status, goal } = query
		const offset = (page - 1) * limit

		const where: WhereOptions = { is_active: true }

		if (status) where.status = status
		if (goal) where.goal = goal

		const { rows: campaigns, count: total } = await Campaign.findAndCountAll({
			where,
			limit,
			offset,
			order: [['createdAt', 'DESC']],
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label'] },
				{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] },
			],
		})

		return {
			statusCode: 200,
			payload: {
				campaigns,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Campaigns fetched successfully',
		}
	}

	async findById(id: string): Promise<IServiceResponse> {
		const campaign = await Campaign.findByPk(id, {
			include: [
				{ model: Product },
				{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] },
			],
		})

		if (!campaign) {
			throw new NotFoundError('Campaign not found')
		}

		return { statusCode: 200, payload: campaign, message: 'Campaign fetched successfully' }
	}

	async update(id: string, data: Partial<Campaign>): Promise<IServiceResponse> {
		const campaign = await Campaign.findByPk(id)

		if (!campaign) {
			throw new NotFoundError('Campaign not found')
		}

		await campaign.update(data)

		return { statusCode: 200, payload: campaign, message: 'Campaign updated successfully' }
	}

	async delete(id: string): Promise<IServiceResponse> {
		const campaign = await Campaign.findByPk(id)

		if (!campaign) {
			throw new NotFoundError('Campaign not found')
		}

		await campaign.destroy()

		return { statusCode: 200, payload: null, message: 'Campaign deleted successfully' }
	}
}

export const campaignService = new CampaignService()
