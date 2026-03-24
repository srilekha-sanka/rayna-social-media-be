import { BadRequestError } from '../../errors/api-errors'

interface CreateProductBody {
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
}

interface UpdateProductBody extends Partial<CreateProductBody> {}

interface ProductListQuery {
	page: number
	limit: number
	category?: string
	city?: string
	search?: string
}

export const validateCreateProduct = (body: any): CreateProductBody => {
	const { name, description, price } = body

	if (!name || !description) {
		throw new BadRequestError('name and description are required')
	}

	if (price === undefined || price === null || isNaN(Number(price))) {
		throw new BadRequestError('price is required and must be a number')
	}

	if (Number(price) < 0) {
		throw new BadRequestError('price must be a positive number')
	}

	if (body.compare_at_price !== undefined && isNaN(Number(body.compare_at_price))) {
		throw new BadRequestError('compare_at_price must be a number')
	}

	if (body.image_urls && !Array.isArray(body.image_urls)) {
		throw new BadRequestError('image_urls must be an array')
	}

	if (body.highlights && !Array.isArray(body.highlights)) {
		throw new BadRequestError('highlights must be an array')
	}

	return {
		name: name.trim(),
		description: description.trim(),
		short_description: body.short_description?.trim(),
		price: Number(price),
		compare_at_price: body.compare_at_price ? Number(body.compare_at_price) : undefined,
		currency: body.currency?.trim() || 'AED',
		offer_label: body.offer_label?.trim(),
		category: body.category?.trim(),
		city: body.city?.trim(),
		base_url: body.base_url?.trim(),
		image_urls: body.image_urls || [],
		highlights: body.highlights || [],
		meta: body.meta,
	}
}

export const validateUpdateProduct = (body: any): UpdateProductBody => {
	if (body.price !== undefined && isNaN(Number(body.price))) {
		throw new BadRequestError('price must be a number')
	}

	if (body.price !== undefined && Number(body.price) < 0) {
		throw new BadRequestError('price must be a positive number')
	}

	if (body.image_urls && !Array.isArray(body.image_urls)) {
		throw new BadRequestError('image_urls must be an array')
	}

	if (body.highlights && !Array.isArray(body.highlights)) {
		throw new BadRequestError('highlights must be an array')
	}

	const update: UpdateProductBody = {}

	if (body.name !== undefined) update.name = body.name.trim()
	if (body.description !== undefined) update.description = body.description.trim()
	if (body.short_description !== undefined) update.short_description = body.short_description.trim()
	if (body.price !== undefined) update.price = Number(body.price)
	if (body.compare_at_price !== undefined) update.compare_at_price = Number(body.compare_at_price)
	if (body.currency !== undefined) update.currency = body.currency.trim()
	if (body.offer_label !== undefined) update.offer_label = body.offer_label.trim()
	if (body.category !== undefined) update.category = body.category.trim()
	if (body.city !== undefined) update.city = body.city.trim()
	if (body.base_url !== undefined) update.base_url = body.base_url.trim()
	if (body.image_urls !== undefined) update.image_urls = body.image_urls
	if (body.highlights !== undefined) update.highlights = body.highlights
	if (body.meta !== undefined) update.meta = body.meta

	return update
}

export const validateProductListQuery = (query: any): ProductListQuery => {
	return {
		page: Math.max(1, parseInt(query.page, 10) || 1),
		limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20)),
		category: query.category?.trim(),
		city: query.city?.trim(),
		search: query.search?.trim(),
	}
}
