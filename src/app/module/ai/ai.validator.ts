import Joi from 'joi'

const VALID_INTENTS = ['SELL', 'VALUE', 'ENGAGEMENT'] as const
const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'snapchat', 'telegram'] as const

export const captionRequestSchema = Joi.object({
	product_name: Joi.string().required().trim(),
	product_description: Joi.string().required().trim(),
	usp: Joi.string().optional().trim(),
	offer: Joi.string().optional().trim(),
	intent: Joi.string().valid(...VALID_INTENTS).required(),
	platform: Joi.string().lowercase().valid(...VALID_PLATFORMS).required(),
	tone: Joi.string().optional().trim(),
})

export const hashtagRequestSchema = Joi.object({
	product_name: Joi.string().required().trim(),
	category: Joi.string().optional().trim(),
	city: Joi.string().optional().trim(),
	platform: Joi.string().lowercase().valid(...VALID_PLATFORMS).required(),
})

export const carouselRequestSchema = Joi.object({
	product_name: Joi.string().required().trim(),
	product_description: Joi.string().required().trim(),
	price: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
	offer: Joi.string().optional().trim(),
	intent: Joi.string().valid(...VALID_INTENTS).required(),
	platform: Joi.string().lowercase().valid(...VALID_PLATFORMS).required(),
	slide_count: Joi.number().integer().min(2).max(10).optional().default(4),
})
