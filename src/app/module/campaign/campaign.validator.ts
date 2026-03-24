import { BadRequestError } from '../../errors/api-errors'

const VALID_GOALS = ['SELL', 'VALUE', 'ENGAGEMENT']
const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']

interface CreateCampaignBody {
	name: string
	type: string
	goal: 'SELL' | 'VALUE' | 'ENGAGEMENT'
	target_audience?: object
	start_date?: string
	end_date?: string
	product_id?: string
}

interface UpdateCampaignBody extends Partial<CreateCampaignBody> {
	status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
}

export const validateCreateCampaign = (body: any): CreateCampaignBody => {
	const { name, type, goal } = body

	if (!name || !type || !goal) {
		throw new BadRequestError('name, type, and goal are required')
	}

	if (!VALID_GOALS.includes(goal)) {
		throw new BadRequestError(`goal must be one of: ${VALID_GOALS.join(', ')}`)
	}

	if (body.start_date && body.end_date && new Date(body.start_date) > new Date(body.end_date)) {
		throw new BadRequestError('start_date must be before end_date')
	}

	return {
		name: name.trim(),
		type: type.trim(),
		goal,
		target_audience: body.target_audience,
		start_date: body.start_date,
		end_date: body.end_date,
		product_id: body.product_id,
	}
}

export const validateUpdateCampaign = (body: any): UpdateCampaignBody => {
	if (body.goal && !VALID_GOALS.includes(body.goal)) {
		throw new BadRequestError(`goal must be one of: ${VALID_GOALS.join(', ')}`)
	}

	if (body.status && !VALID_STATUSES.includes(body.status)) {
		throw new BadRequestError(`status must be one of: ${VALID_STATUSES.join(', ')}`)
	}

	const update: UpdateCampaignBody = {}

	if (body.name !== undefined) update.name = body.name.trim()
	if (body.type !== undefined) update.type = body.type.trim()
	if (body.goal !== undefined) update.goal = body.goal
	if (body.target_audience !== undefined) update.target_audience = body.target_audience
	if (body.start_date !== undefined) update.start_date = body.start_date
	if (body.end_date !== undefined) update.end_date = body.end_date
	if (body.product_id !== undefined) update.product_id = body.product_id
	if (body.status !== undefined) update.status = body.status

	return update
}
