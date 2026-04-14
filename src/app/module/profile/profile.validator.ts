import Joi from 'joi'

export const updateProfileSchema = Joi.object({
	first_name: Joi.string().trim().min(1).max(100).optional(),
	last_name: Joi.string().trim().max(100).allow('', null).optional(),
	title: Joi.string().trim().max(255).allow('', null).optional(),
	timezone: Joi.string().trim().max(100).optional(),
	bio: Joi.string().trim().max(1000).allow('', null).optional(),
}).min(1)
