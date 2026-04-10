import Joi from 'joi'

export const createProductSchema = Joi.object({
	name: Joi.string().required().trim(),
	description: Joi.string().required().trim(),
	short_description: Joi.string().optional().trim(),
	price: Joi.number().min(0).required(),
	compare_at_price: Joi.number().optional(),
	currency: Joi.string().optional().trim().default('AED'),
	offer_label: Joi.string().optional().trim(),
	category: Joi.string().optional().trim(),
	city: Joi.string().optional().trim(),
	base_url: Joi.string().optional().trim(),
	image_urls: Joi.array().items(Joi.string()).optional().default([]),
	highlights: Joi.array().items(Joi.string()).optional().default([]),
	meta: Joi.object().optional(),
})

export const updateProductSchema = Joi.object({
	name: Joi.string().optional().trim(),
	description: Joi.string().optional().trim(),
	short_description: Joi.string().optional().trim(),
	price: Joi.number().min(0).optional(),
	compare_at_price: Joi.number().optional(),
	currency: Joi.string().optional().trim(),
	offer_label: Joi.string().optional().trim(),
	category: Joi.string().optional().trim(),
	city: Joi.string().optional().trim(),
	base_url: Joi.string().optional().trim(),
	image_urls: Joi.array().items(Joi.string()).optional(),
	highlights: Joi.array().items(Joi.string()).optional(),
	meta: Joi.object().optional(),
}).min(1)

export const productListQuerySchema = Joi.object({
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
	category: Joi.string().optional().trim(),
	city: Joi.string().optional().trim(),
	search: Joi.string().optional().trim(),
})
