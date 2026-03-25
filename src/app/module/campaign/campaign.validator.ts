import Joi from 'joi'

const VALID_GOALS = ['SELL', 'VALUE', 'ENGAGEMENT'] as const
const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'] as const

export const createCampaignSchema = Joi.object({
	name: Joi.string().required().trim(),
	type: Joi.string().required().trim(),
	goal: Joi.string().valid(...VALID_GOALS).required(),
	target_audience: Joi.object().optional(),
	start_date: Joi.string().isoDate().optional(),
	end_date: Joi.string().isoDate().optional(),
	product_id: Joi.string().uuid().optional(),
}).custom((value, helpers) => {
	if (value.start_date && value.end_date && new Date(value.start_date) > new Date(value.end_date)) {
		return helpers.error('any.invalid', { message: 'start_date must be before end_date' })
	}
	return value
})

export const updateCampaignSchema = Joi.object({
	name: Joi.string().optional().trim(),
	type: Joi.string().optional().trim(),
	goal: Joi.string().valid(...VALID_GOALS).optional(),
	target_audience: Joi.object().optional(),
	start_date: Joi.string().isoDate().optional(),
	end_date: Joi.string().isoDate().optional(),
	product_id: Joi.string().uuid().optional(),
	status: Joi.string().valid(...VALID_STATUSES).optional(),
})
