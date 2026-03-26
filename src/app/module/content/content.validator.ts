import Joi from 'joi'

const VALID_INTENTS = ['SELL', 'VALUE', 'ENGAGEMENT'] as const
const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'snapchat', 'telegram'] as const

export const generateCarouselSchema = Joi.object({
	product_id: Joi.string().uuid().required(),
	campaign_id: Joi.string().uuid().optional(),
	platform: Joi.string().lowercase().valid(...VALID_PLATFORMS).required(),
	slide_count: Joi.number().integer().min(2).max(10).optional(),
	intent: Joi.string().valid(...VALID_INTENTS).optional(),
})

export const generateReelSchema = Joi.object({
	product_id: Joi.string().uuid().required(),
	campaign_id: Joi.string().uuid().optional(),
	platform: Joi.string().lowercase().valid(...VALID_PLATFORMS).required(),
	slide_duration: Joi.number().min(1).max(10).optional().default(3),
	transition_duration: Joi.number().min(0).max(5).optional().default(1),
})
