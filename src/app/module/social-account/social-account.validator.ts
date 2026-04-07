import Joi from 'joi'

const VALID_PLATFORMS = [
	'facebook',
	'instagram',
	'x',
	'linkedin',
	'tiktok',
	'youtube',
	'pinterest',
	'threads',
	'bluesky',
	'google_business',
] as const

export const getAuthUrlSchema = Joi.object({
	platform: Joi.string()
		.lowercase()
		.valid(...VALID_PLATFORMS)
		.required(),
	redirect_url: Joi.string().uri().optional(),
})

export const finalizeConnectionSchema = Joi.object({
	platform: Joi.string()
		.lowercase()
		.valid(...VALID_PLATFORMS)
		.required(),
})

export const disconnectSchema = Joi.object({
	id: Joi.string().uuid().required(),
})

export const listAccountsQuerySchema = Joi.object({
	platform: Joi.string()
		.lowercase()
		.valid(...VALID_PLATFORMS)
		.optional(),
	status: Joi.string().valid('CONNECTED', 'EXPIRED', 'DISCONNECTED', 'PENDING').optional(),
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(100).default(20),
})
