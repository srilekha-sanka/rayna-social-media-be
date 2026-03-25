import Joi from 'joi'

export const registerSchema = Joi.object({
	email: Joi.string().email().required().lowercase().trim(),
	password: Joi.string().min(8).required(),
	first_name: Joi.string().required().trim(),
	last_name: Joi.string().optional().trim(),
})

export const loginSchema = Joi.object({
	email: Joi.string().email().required().lowercase().trim(),
	password: Joi.string().required(),
})

export const refreshTokenSchema = Joi.object({
	refresh_token: Joi.string().required(),
})
