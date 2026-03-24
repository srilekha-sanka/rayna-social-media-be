import { BadRequestError } from '../../errors/api-errors'

const VALID_INTENTS = ['SELL', 'VALUE', 'ENGAGEMENT']
const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'snapchat', 'telegram']

export const validateCaptionRequest = (body: any) => {
	const { product_name, product_description, intent, platform } = body

	if (!product_name || !product_description) {
		throw new BadRequestError('product_name and product_description are required')
	}

	if (!intent || !VALID_INTENTS.includes(intent)) {
		throw new BadRequestError(`intent must be one of: ${VALID_INTENTS.join(', ')}`)
	}

	if (!platform || !VALID_PLATFORMS.includes(platform.toLowerCase())) {
		throw new BadRequestError(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`)
	}

	return {
		product_name: product_name.trim(),
		product_description: product_description.trim(),
		usp: body.usp?.trim(),
		offer: body.offer?.trim(),
		intent,
		platform: platform.toLowerCase(),
		tone: body.tone?.trim(),
	}
}

export const validateHashtagRequest = (body: any) => {
	const { product_name, platform } = body

	if (!product_name) {
		throw new BadRequestError('product_name is required')
	}

	if (!platform || !VALID_PLATFORMS.includes(platform.toLowerCase())) {
		throw new BadRequestError(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`)
	}

	return {
		product_name: product_name.trim(),
		category: body.category?.trim(),
		city: body.city?.trim(),
		platform: platform.toLowerCase(),
	}
}

export const validateCarouselRequest = (body: any) => {
	const { product_name, product_description, price, intent, platform, slide_count } = body

	if (!product_name || !product_description || !price) {
		throw new BadRequestError('product_name, product_description, and price are required')
	}

	if (!intent || !VALID_INTENTS.includes(intent)) {
		throw new BadRequestError(`intent must be one of: ${VALID_INTENTS.join(', ')}`)
	}

	if (!platform || !VALID_PLATFORMS.includes(platform.toLowerCase())) {
		throw new BadRequestError(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`)
	}

	const count = parseInt(slide_count, 10) || 4

	if (count < 2 || count > 10) {
		throw new BadRequestError('slide_count must be between 2 and 10')
	}

	return {
		product_name: product_name.trim(),
		product_description: product_description.trim(),
		price: String(price).trim(),
		offer: body.offer?.trim(),
		intent,
		platform: platform.toLowerCase(),
		slide_count: count,
	}
}
