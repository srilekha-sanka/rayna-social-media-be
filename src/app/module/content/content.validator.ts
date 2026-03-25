import { BadRequestError } from '../../errors/api-errors'

const VALID_INTENTS = ['SELL', 'VALUE', 'ENGAGEMENT']
const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'snapchat', 'telegram']

interface GenerateCarouselBody {
	product_id: string
	campaign_id?: string
	platform: string
	slide_count?: number
	intent?: 'SELL' | 'VALUE' | 'ENGAGEMENT'
}

export const validateGenerateCarousel = (body: any): GenerateCarouselBody => {
	const { product_id, platform } = body

	if (!product_id) {
		throw new BadRequestError('product_id is required')
	}

	if (!platform || !VALID_PLATFORMS.includes(platform.toLowerCase())) {
		throw new BadRequestError(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`)
	}

	if (body.intent && !VALID_INTENTS.includes(body.intent)) {
		throw new BadRequestError(`intent must be one of: ${VALID_INTENTS.join(', ')}`)
	}

	if (body.slide_count !== undefined) {
		const count = parseInt(body.slide_count, 10)
		if (isNaN(count) || count < 2 || count > 10) {
			throw new BadRequestError('slide_count must be between 2 and 10')
		}
	}

	return {
		product_id,
		campaign_id: body.campaign_id,
		platform: platform.toLowerCase(),
		slide_count: body.slide_count ? parseInt(body.slide_count, 10) : undefined,
		intent: body.intent,
	}
}
