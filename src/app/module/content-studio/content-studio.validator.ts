import Joi from 'joi'

const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'linkedin', 'viber', 'pinterest', 'snapchat'] as const
const VALID_CONTENT_TYPES = ['PRODUCT_PROMO', 'FESTIVAL_GREETING', 'ENGAGEMENT', 'VALUE', 'BRAND_AWARENESS'] as const
const VALID_POST_TYPES = ['reel', 'image', 'carousel', 'cinematic_video', 'story', 'text'] as const

const CONTENT_TYPE_ALIASES: Record<string, string> = {
	promotion: 'PRODUCT_PROMO',
	promo: 'PRODUCT_PROMO',
	product_promo: 'PRODUCT_PROMO',
	festival: 'FESTIVAL_GREETING',
	greeting: 'FESTIVAL_GREETING',
	festival_greeting: 'FESTIVAL_GREETING',
	engagement: 'ENGAGEMENT',
	value: 'VALUE',
	brand: 'BRAND_AWARENESS',
	brand_awareness: 'BRAND_AWARENESS',
}

const normalizeContentType = (value: string): string => {
	const upper = value.toUpperCase()
	if (VALID_CONTENT_TYPES.includes(upper as any)) return upper
	return CONTENT_TYPE_ALIASES[value.toLowerCase()] || value
}

const VALID_ENTRY_STATUSES = ['SUGGESTED', 'APPROVED', 'COMPOSING', 'READY', 'SCHEDULED', 'PUBLISHED', 'SKIPPED'] as const
const VALID_PLAN_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED'] as const

export const generatePlanSchema = Joi.object({
	name: Joi.string().required().trim(),
	start_date: Joi.string().isoDate().required(),
	end_date: Joi.string().isoDate().required(),
	platforms: Joi.array().items(Joi.string().valid(...VALID_PLATFORMS)).min(1).required(),
	product_ids: Joi.array().items(Joi.string().uuid()).optional(),
	product_type: Joi.string().optional().trim().lowercase(),
	include_festivals: Joi.boolean().default(true),
	include_engagement: Joi.boolean().default(true),
	posts_per_day: Joi.number().integer().min(1).max(5).default(1),
	tone: Joi.string().optional().trim().valid('professional', 'casual', 'luxury', 'adventurous', 'friendly', 'urgency').default('adventurous'),
	target_audience: Joi.string().optional().trim().default('tourists and residents in UAE aged 20-45'),
	primary_goal: Joi.string().optional().trim().valid('bookings', 'engagement', 'brand_awareness', 'followers').default('bookings'),
	region: Joi.string().optional().trim().default('UAE'),
	language: Joi.string().optional().trim().lowercase().default('english'),
	post_types: Joi.array().items(Joi.string().valid(...VALID_POST_TYPES)).optional().default([...VALID_POST_TYPES]),
	special_notes: Joi.string().optional().allow('').trim(),
}).custom((value, helpers) => {
	if (new Date(value.start_date) > new Date(value.end_date)) {
		return helpers.error('any.invalid', { message: 'start_date must be before end_date' })
	}
	const daysDiff = Math.ceil((new Date(value.end_date).getTime() - new Date(value.start_date).getTime()) / 86400000)
	if (daysDiff > 90) {
		return helpers.error('any.invalid', { message: 'Plan duration cannot exceed 90 days' })
	}
	return value
})

export const generateEntriesSchema = Joi.object({
	platforms: Joi.array().items(Joi.string().valid(...VALID_PLATFORMS)).min(1).required(),
	product_ids: Joi.array().items(Joi.string().uuid()).optional(),
	product_type: Joi.string().optional().trim().lowercase(),
	include_festivals: Joi.boolean().default(true),
	include_engagement: Joi.boolean().default(true),
	posts_per_day: Joi.number().integer().min(1).max(5).default(1),
	tone: Joi.string().optional().trim().valid('professional', 'casual', 'luxury', 'adventurous', 'friendly', 'urgency').default('adventurous'),
	target_audience: Joi.string().optional().trim().default('tourists and residents in UAE aged 20-45'),
	primary_goal: Joi.string().optional().trim().valid('bookings', 'engagement', 'brand_awareness', 'followers').default('bookings'),
	region: Joi.string().optional().trim().default('UAE'),
	language: Joi.string().optional().trim().lowercase().default('english'),
	post_types: Joi.array().items(Joi.string().valid(...VALID_POST_TYPES)).optional().default([...VALID_POST_TYPES]),
	special_notes: Joi.string().optional().allow('').trim(),
	skip_existing_dates: Joi.boolean().default(true),
})

export const quickCreatePlanSchema = Joi.object({
	name: Joi.string().required().trim(),
	start_date: Joi.string().isoDate().required(),
	end_date: Joi.string().isoDate().required(),
}).custom((value, helpers) => {
	if (new Date(value.start_date) > new Date(value.end_date)) {
		return helpers.error('any.invalid', { message: 'start_date must be before end_date' })
	}
	return value
})

export const updatePlanSchema = Joi.object({
	name: Joi.string().optional().trim(),
	status: Joi.string().valid(...VALID_PLAN_STATUSES).optional(),
	language: Joi.string().optional().trim().lowercase(),
	post_types: Joi.array().items(Joi.string().valid(...VALID_POST_TYPES)).min(1).optional(),
})

export const createEntrySchema = Joi.object({
	content_plan_id: Joi.string().uuid().required(),
	date: Joi.string().isoDate().required(),
	title: Joi.string().required().trim(),
	description: Joi.string().optional().allow('').trim(),
	content_type: Joi.string().required().custom((val) => {
		const normalized = normalizeContentType(val)
		if (!VALID_CONTENT_TYPES.includes(normalized as any)) {
			throw new Error(`content_type must be one of [${VALID_CONTENT_TYPES.join(', ')}]`)
		}
		return normalized
	}),
	post_type: Joi.string().valid(...VALID_POST_TYPES).optional().default('image'),
	language: Joi.string().optional().trim().lowercase().default('english'),
	platform: Joi.string().valid(...VALID_PLATFORMS).required(),
	product_id: Joi.string().uuid().optional(),
	campaign_id: Joi.string().uuid().optional(),
})

export const updateEntrySchema = Joi.object({
	title: Joi.string().optional().trim(),
	description: Joi.string().optional().allow('').trim(),
	content_type: Joi.string().valid(...VALID_CONTENT_TYPES).optional(),
	post_type: Joi.string().valid(...VALID_POST_TYPES).optional(),
	language: Joi.string().optional().trim().lowercase(),
	platform: Joi.string().valid(...VALID_PLATFORMS).optional(),
	product_id: Joi.string().uuid().optional().allow(null),
	campaign_id: Joi.string().uuid().optional().allow(null),
	status: Joi.string().valid(...VALID_ENTRY_STATUSES).optional(),
})

export const composeEntrySchema = Joi.object({
	content_source: Joi.string().valid('PRODUCT', 'STOCK', 'AI_GENERATED').default('PRODUCT'),
	base_content: Joi.string().optional().allow('').trim(),
	hashtags: Joi.array().items(Joi.string()).optional(),
	media_urls: Joi.array().items(Joi.string()).optional(),
	// STOCK source fields
	stock_image_urls: Joi.array().items(Joi.string().uri()).when('content_source', {
		is: 'STOCK',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	apply_overlay: Joi.boolean().default(true),
	generate_ai_caption: Joi.boolean().default(true),
	// AI_GENERATED source fields
	ai_image_style: Joi.string().valid('photo', 'digital-art', '3d', 'painting').default('photo'),
	ai_image_prompt: Joi.string().optional().allow('').trim(),
	num_images: Joi.number().integer().min(1).max(4).default(1),
	// Design template selection
	template_id: Joi.string().uuid().optional().allow(null),
})

export const calendarQuerySchema = Joi.object({
	start_date: Joi.string().isoDate().required(),
	end_date: Joi.string().isoDate().required(),
	platform: Joi.string().valid(...VALID_PLATFORMS).optional(),
	content_type: Joi.string().valid(...VALID_CONTENT_TYPES).optional(),
	status: Joi.alternatives().try(
		Joi.string().valid(...VALID_ENTRY_STATUSES),
		Joi.string().custom((val) => {
			const statuses = val.split(',').map((s: string) => s.trim())
			for (const s of statuses) {
				if (!VALID_ENTRY_STATUSES.includes(s as any)) {
					throw new Error(`Invalid status: ${s}`)
				}
			}
			return statuses
		})
	).optional(),
	content_plan_id: Joi.string().uuid().optional(),
})
