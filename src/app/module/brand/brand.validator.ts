import Joi from 'joi'

export const createBrandSchema = Joi.object({
	name: Joi.string().max(255).required().trim(),
	logo_url: Joi.string().uri().optional().trim(),
	website: Joi.string().uri().optional().trim(),
	industry: Joi.string().max(255).optional().trim(),
	timezone: Joi.string().max(100).optional().default('Asia/Dubai').trim(),
})

export const updateBrandSchema = Joi.object({
	name: Joi.string().max(255).optional().trim(),
	logo_url: Joi.string().uri().optional().allow(null).trim(),
	website: Joi.string().uri().optional().allow(null).trim(),
	industry: Joi.string().max(255).optional().allow(null).trim(),
	timezone: Joi.string().max(100).optional().trim(),
}).min(1)
