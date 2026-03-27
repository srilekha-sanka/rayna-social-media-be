import Joi from 'joi'

const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'linkedin', 'viber', 'pinterest', 'snapchat'] as const
const VALID_CONTENT_TYPES = ['PRODUCT_PROMO', 'FESTIVAL_GREETING', 'ENGAGEMENT', 'VALUE', 'BRAND_AWARENESS'] as const

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
const VALID_ENTRY_STATUSES = ['SUGGESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'SKIPPED'] as const
const VALID_PLAN_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED'] as const

export const generatePlanSchema = Joi.object({
	name: Joi.string().required().trim(),
	brand_id: Joi.string().uuid().optional(),
	start_date: Joi.string().isoDate().required(),
	end_date: Joi.string().isoDate().required(),
	platforms: Joi.array().items(Joi.string().valid(...VALID_PLATFORMS)).min(1).required(),
	product_ids: Joi.array().items(Joi.string().uuid()).optional(),
	include_festivals: Joi.boolean().default(true),
	include_engagement: Joi.boolean().default(true),
	posts_per_day: Joi.number().integer().min(1).max(5).default(1),
	tone: Joi.string().optional().trim().valid('professional', 'casual', 'luxury', 'adventurous', 'friendly', 'urgency').default('adventurous'),
	target_audience: Joi.string().optional().trim().default('tourists and residents in UAE aged 20-45'),
	primary_goal: Joi.string().optional().trim().valid('bookings', 'engagement', 'brand_awareness', 'followers').default('bookings'),
	region: Joi.string().optional().trim().default('UAE'),
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
	include_festivals: Joi.boolean().default(true),
	include_engagement: Joi.boolean().default(true),
	posts_per_day: Joi.number().integer().min(1).max(5).default(1),
	tone: Joi.string().optional().trim().valid('professional', 'casual', 'luxury', 'adventurous', 'friendly', 'urgency').default('adventurous'),
	target_audience: Joi.string().optional().trim().default('tourists and residents in UAE aged 20-45'),
	primary_goal: Joi.string().optional().trim().valid('bookings', 'engagement', 'brand_awareness', 'followers').default('bookings'),
	region: Joi.string().optional().trim().default('UAE'),
	special_notes: Joi.string().optional().allow('').trim(),
	skip_existing_dates: Joi.boolean().default(true),
})

export const quickCreatePlanSchema = Joi.object({
	name: Joi.string().required().trim(),
	start_date: Joi.string().isoDate().required(),
	end_date: Joi.string().isoDate().required(),
	brand_id: Joi.string().uuid().optional(),
}).custom((value, helpers) => {
	if (new Date(value.start_date) > new Date(value.end_date)) {
		return helpers.error('any.invalid', { message: 'start_date must be before end_date' })
	}
	return value
})

export const updatePlanSchema = Joi.object({
	name: Joi.string().optional().trim(),
	status: Joi.string().valid(...VALID_PLAN_STATUSES).optional(),
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
	platform: Joi.string().valid(...VALID_PLATFORMS).required(),
	product_id: Joi.string().uuid().optional(),
	campaign_id: Joi.string().uuid().optional(),
	media_urls: Joi.array().items(Joi.string().uri()).optional(),
})

export const updateEntrySchema = Joi.object({
	title: Joi.string().optional().trim(),
	description: Joi.string().optional().allow('').trim(),
	content_type: Joi.string().valid(...VALID_CONTENT_TYPES).optional(),
	platform: Joi.string().valid(...VALID_PLATFORMS).optional(),
	product_id: Joi.string().uuid().optional().allow(null),
	campaign_id: Joi.string().uuid().optional().allow(null),
	media_urls: Joi.array().items(Joi.string().uri()).optional(),
	status: Joi.string().valid(...VALID_ENTRY_STATUSES).optional(),
	scheduled_at: Joi.string().isoDate().optional().allow(null),
})

export const bulkUpdateEntriesSchema = Joi.object({
	entry_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
	status: Joi.string().valid(...VALID_ENTRY_STATUSES).required(),
})

export const calendarQuerySchema = Joi.object({
	start_date: Joi.string().isoDate().required(),
	end_date: Joi.string().isoDate().required(),
	platform: Joi.string().valid(...VALID_PLATFORMS).optional(),
	content_type: Joi.string().valid(...VALID_CONTENT_TYPES).optional(),
	status: Joi.string().valid(...VALID_ENTRY_STATUSES).optional(),
	content_plan_id: Joi.string().uuid().optional(),
})
