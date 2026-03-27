import { Request, Response, NextFunction } from 'express'
import { contentStudioService } from './content-studio.service'
import {
	generatePlanSchema,
	updatePlanSchema,
	quickCreatePlanSchema,
	createEntrySchema,
	updateEntrySchema,
	bulkUpdateEntriesSchema,
	calendarQuerySchema,
} from './content-studio.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class ContentStudioController extends ResponseService {
	constructor() {
		super()
	}

	// --- Content Plans ---

	generatePlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = generatePlanSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.generatePlan(value, req.user.userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAllPlans = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const query = {
				page: Math.max(1, parseInt(req.query.page as string, 10) || 1),
				limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20)),
				status: req.query.status as string | undefined,
			}
			const { statusCode, payload, message } = await contentStudioService.findAllPlans(query)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findPlansByDate = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const date = req.query.date as string
			if (!date) throw new BadRequestError('date query parameter is required')
			const { statusCode, payload, message } = await contentStudioService.findPlansByDate(date)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	quickCreatePlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = quickCreatePlanSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.quickCreatePlan(value, req.user.userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getPlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.getPlan(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	updatePlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = updatePlanSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.updatePlan(req.params.id, value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	deletePlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.deletePlan(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	submitForReview = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.submitPlanForReview(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	approvePlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.approvePlan(req.params.id, req.user.userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	rejectPlan = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.rejectPlan(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// --- Calendar Entries ---

	getCalendar = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = calendarQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.getCalendar(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	createEntry = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = createEntrySchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.createEntry(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	updateEntry = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = updateEntrySchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.updateEntry(req.params.id, value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	deleteEntry = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.deleteEntry(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	bulkUpdateEntries = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = bulkUpdateEntriesSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.bulkUpdateEntries(value.entry_ids, value.status)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	linkToPost = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { post_id } = req.body
			if (!post_id) throw new BadRequestError('post_id is required')
			const { statusCode, payload, message } = await contentStudioService.linkEntryToPost(req.params.id, post_id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default ContentStudioController
