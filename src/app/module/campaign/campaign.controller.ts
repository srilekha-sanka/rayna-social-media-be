import { Request, Response, NextFunction } from 'express'
import { campaignService } from './campaign.service'
import { createCampaignSchema, updateCampaignSchema } from './campaign.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class CampaignController extends ResponseService {
	constructor() {
		super()
	}

	create = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = createCampaignSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = req.user.userId
			const { statusCode, payload, message } = await campaignService.create(value, userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAll = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const query = {
				page: Math.max(1, parseInt(req.query.page as string, 10) || 1),
				limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20)),
				status: req.query.status as string | undefined,
				goal: req.query.goal as string | undefined,
			}
			const { statusCode, payload, message } = await campaignService.findAll(query)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await campaignService.findById(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	update = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = updateCampaignSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await campaignService.update(req.params.id, value as any)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	delete = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await campaignService.delete(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default CampaignController
