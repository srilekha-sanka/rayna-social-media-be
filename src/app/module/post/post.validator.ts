import Joi from 'joi'

const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'snapchat', 'telegram'] as const
const VALID_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'] as const

export const createPostSchema = Joi.object({
	campaign_id: Joi.string().uuid().optional(),
	base_content: Joi.string().optional().trim(),
	hashtags: Joi.array().items(Joi.string()).optional().default([]),
	cta_text: Joi.string().optional().trim(),
	platforms: Joi.array().items(Joi.string().lowercase().valid(...VALID_PLATFORMS)).optional().default([]),
	media_urls: Joi.array().items(Joi.string()).optional().default([]),
	scheduled_at: Joi.string().isoDate().optional(),
})

export const updatePostSchema = Joi.object({
	base_content: Joi.string().optional().trim(),
	hashtags: Joi.array().items(Joi.string()).optional(),
	cta_text: Joi.string().optional().trim(),
	platforms: Joi.array().items(Joi.string().lowercase().valid(...VALID_PLATFORMS)).optional(),
	media_urls: Joi.array().items(Joi.string()).optional(),
	status: Joi.string().valid(...VALID_STATUSES).optional(),
	scheduled_at: Joi.string().isoDate().optional(),
})

export const schedulePostSchema = Joi.object({
	scheduled_at: Joi.string().isoDate().required(),
})

export const rejectPostSchema = Joi.object({
	reason: Joi.string().required().trim(),
})

export const approvePostSchema = Joi.object({
	note: Joi.string().optional().trim(),
})
