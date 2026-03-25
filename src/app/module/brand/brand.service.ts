import { WhereOptions } from 'sequelize'
import Brand from './brand.model'
import User from '../user/user.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError } from '../../errors/api-errors'

class BrandService {
	async create(
		data: {
			name: string
			logo_url?: string
			website?: string
			industry?: string
			timezone?: string
		},
		createdBy: string
	): Promise<IServiceResponse> {
		const brand = await Brand.create({
			...data,
			created_by: createdBy,
		} as any)

		const full = await Brand.findByPk(brand.id, {
			include: [{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] }],
		})

		return { statusCode: 201, payload: full, message: 'Brand created successfully' }
	}

	async findAll(query: { page: number; limit: number }): Promise<IServiceResponse> {
		const { page, limit } = query
		const offset = (page - 1) * limit

		const where: WhereOptions = { is_active: true }

		const { rows: brands, count: total } = await Brand.findAndCountAll({
			where,
			limit,
			offset,
			order: [['createdAt', 'DESC']],
			include: [{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] }],
		})

		return {
			statusCode: 200,
			payload: {
				brands,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Brands fetched successfully',
		}
	}

	async findById(id: string): Promise<IServiceResponse> {
		const brand = await Brand.findByPk(id, {
			include: [{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] }],
		})

		if (!brand) {
			throw new NotFoundError('Brand not found')
		}

		return { statusCode: 200, payload: brand, message: 'Brand fetched successfully' }
	}

	async update(id: string, data: Partial<Brand>): Promise<IServiceResponse> {
		const brand = await Brand.findByPk(id)

		if (!brand) {
			throw new NotFoundError('Brand not found')
		}

		await brand.update(data)

		const updated = await Brand.findByPk(id, {
			include: [{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] }],
		})

		return { statusCode: 200, payload: updated, message: 'Brand updated successfully' }
	}

	async delete(id: string): Promise<IServiceResponse> {
		const brand = await Brand.findByPk(id)

		if (!brand) {
			throw new NotFoundError('Brand not found')
		}

		await brand.destroy()

		return { statusCode: 200, payload: null, message: 'Brand deleted successfully' }
	}
}

export const brandService = new BrandService()
