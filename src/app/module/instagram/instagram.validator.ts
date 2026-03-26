import Joi from 'joi'

export const saveCredentialsSchema = Joi.object({
	access_token: Joi.string().required().trim(),
	ig_user_id: Joi.string().required().trim(),
})

export const publishPostSchema = Joi.object({
	image_url: Joi.string().uri().optional(),
	video_url: Joi.string().uri().optional(),
	caption: Joi.string().required().trim(),
	media_type: Joi.string().valid('IMAGE', 'VIDEO', 'REELS').default('IMAGE'),
}).custom((value, helpers) => {
	if (value.media_type === 'IMAGE' && !value.image_url) {
		return helpers.error('any.custom', { message: 'image_url is required for IMAGE posts' })
	}
	if ((value.media_type === 'VIDEO' || value.media_type === 'REELS') && !value.video_url) {
		return helpers.error('any.custom', { message: 'video_url is required for VIDEO/REELS posts' })
	}
	return value
})

export const getMediaSchema = Joi.object({
	limit: Joi.number().integer().min(1).max(100).default(20),
})
