import { Op, WhereOptions } from 'sequelize'
import Product from './product.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError } from '../../errors/api-errors'

class ProductService {
	async create(data: {
		name: string
		description: string
		short_description?: string
		price: number
		compare_at_price?: number
		currency?: string
		offer_label?: string
		category?: string
		city?: string
		base_url?: string
		image_urls?: string[]
		highlights?: string[]
		meta?: object
		source_product_id?: number
		product_type?: string
		country?: string
		city_id?: number
		address?: string
		latitude?: number
		longitude?: number
		avg_rating?: number
		review_count?: number
		duration?: string
		pickup?: string
		transport?: string
		meals?: string
		language?: string
		group_size?: string
		confirmation?: string
		cancellation?: string
		availability_status?: string
		booking_url?: string
		price_variant?: string
		promotion_badge?: string
		amenities_raw?: string
		image_count?: number
		detail_title?: string
		detail_share_url?: string
		voucher?: string
		total_price?: number
		discount_percent?: number
		discounted_price?: number
		listing_amenities?: string
		price_yacht_type?: string
	}): Promise<IServiceResponse> {
		const product = await Product.create(data)

		return { statusCode: 201, payload: product, message: 'Product created successfully' }
	}

	async findAll(query: {
		page: number
		limit: number
		category?: string
		city?: string
		search?: string
		product_type?: string
		country?: string
	}): Promise<IServiceResponse> {
		const { page, limit, category, city, search, product_type, country } = query
		const offset = (page - 1) * limit

		const where: WhereOptions = { is_active: true }

		if (category) {
			where.category = category
		}

		if (city) {
			where.city = { [Op.iLike]: city }
		}

		if (product_type) {
			where.product_type = { [Op.iLike]: product_type }
		}

		if (country) {
			where.country = { [Op.iLike]: country }
		}

		if (search) {
			where[Op.or as any] = [
				{ name: { [Op.iLike]: `%${search}%` } },
				{ description: { [Op.iLike]: `%${search}%` } },
			]
		}

		const { rows: products, count: total } = await Product.findAndCountAll({
			where,
			limit,
			offset,
			order: [['createdAt', 'DESC']],
		})

		return {
			statusCode: 200,
			payload: {
				products,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			},
			message: 'Products fetched successfully',
		}
	}

	async findById(id: string): Promise<IServiceResponse> {
		const product = await Product.findByPk(id)

		if (!product) {
			throw new NotFoundError('Product not found')
		}

		return { statusCode: 200, payload: product, message: 'Product fetched successfully' }
	}

	async update(id: string, data: Partial<Product>): Promise<IServiceResponse> {
		const product = await Product.findByPk(id)

		if (!product) {
			throw new NotFoundError('Product not found')
		}

		await product.update(data)

		return { statusCode: 200, payload: product, message: 'Product updated successfully' }
	}

	async delete(id: string): Promise<IServiceResponse> {
		const product = await Product.findByPk(id)

		if (!product) {
			throw new NotFoundError('Product not found')
		}

		await product.destroy()

		return { statusCode: 200, payload: null, message: 'Product deleted successfully' }
	}

	async bulkCreate(
		products: Array<{
			name: string
			description: string
			short_description?: string
			price: number
			compare_at_price?: number
			currency?: string
			offer_label?: string
			category?: string
			city?: string
			base_url?: string
			image_urls?: string[]
			highlights?: string[]
			meta?: object
			source_product_id?: number
			product_type?: string
			country?: string
			city_id?: number
			address?: string
			latitude?: number
			longitude?: number
			avg_rating?: number
			review_count?: number
			duration?: string
			pickup?: string
			transport?: string
			meals?: string
			language?: string
			group_size?: string
			confirmation?: string
			cancellation?: string
			availability_status?: string
			booking_url?: string
			price_variant?: string
			promotion_badge?: string
			amenities_raw?: string
			image_count?: number
			detail_title?: string
			detail_share_url?: string
			voucher?: string
			total_price?: number
			discount_percent?: number
			discounted_price?: number
			listing_amenities?: string
			price_yacht_type?: string
		}>
	): Promise<IServiceResponse> {
		const created = await Product.bulkCreate(products)

		return { statusCode: 201, payload: created, message: `${created.length} products created successfully` }
	}
}

export const productService = new ProductService()
