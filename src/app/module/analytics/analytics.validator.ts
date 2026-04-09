import Joi from 'joi'

const VALID_PLATFORMS = [
	'instagram', 'facebook', 'x', 'linkedin', 'tiktok',
	'youtube', 'reddit', 'threads', 'snapchat', 'telegram',
] as const

const VALID_SORT_FIELDS = [
	'engagement', 'likes', 'comments', 'shares', 'reach',
	'impressions', 'clicks', 'saves', 'video_views',
] as const

export const dateRangeSchema = Joi.object({
	from: Joi.string().isoDate().optional(),
	to: Joi.string().isoDate().optional(),
})

export const topPostsQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).optional().default(1),
	limit: Joi.number().integer().min(1).max(100).optional().default(10),
	platform: Joi.string().lowercase().valid(...VALID_PLATFORMS).optional(),
	sort_by: Joi.string().valid(...VALID_SORT_FIELDS).optional().default('engagement'),
	sort_order: Joi.string().uppercase().valid('ASC', 'DESC').optional().default('DESC'),
	from: Joi.string().isoDate().optional(),
	to: Joi.string().isoDate().optional(),
})

export const accountFeedQuerySchema = Joi.object({
	limit: Joi.number().integer().min(1).max(100).optional().default(25),
	cursor: Joi.string().optional(),
})
