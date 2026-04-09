import { Request, Response, NextFunction } from 'express'
import { contentStudioService } from './content-studio.service'
import {
	generatePlanSchema,
	generateEntriesSchema,
	updatePlanSchema,
	quickCreatePlanSchema,
	createEntrySchema,
	updateEntrySchema,
	composeEntrySchema,
	calendarQuerySchema,
} from './content-studio.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class ContentStudioController extends ResponseService {
	constructor() {
		super()
	}

	// --- Design Templates ---

	listDesignTemplates = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const mediaType = req.query.media_type as string | undefined
			const { statusCode, payload, message } = await contentStudioService.listDesignTemplates(mediaType)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getDesignTemplate = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.getDesignTemplate(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
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

	generateEntries = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = generateEntriesSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.generateEntriesForPlan(req.params.id, value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.getJobStatus(req.params.jobId)
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

	// --- Review Queue ---

	getReviewQueue = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const query = {
				page: Math.max(1, parseInt(req.query.page as string, 10) || 1),
				limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20)),
				platform: req.query.platform as string | undefined,
				content_plan_id: req.query.content_plan_id as string | undefined,
			}
			const { statusCode, payload, message } = await contentStudioService.getReviewQueue(query)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// --- Scheduling ---

	getSuggestedTimes = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const date = req.query.date as string
			const platform = req.query.platform as string
			if (!date || !platform) throw new BadRequestError('date and platform query params are required')
			const { statusCode, payload, message } = await contentStudioService.getSuggestedTimes({ date, platform })
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getEntryDetail = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.getEntryDetail(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	bulkSchedule = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { items } = req.body
			if (!items?.length) throw new BadRequestError('items array is required with { post_id, scheduled_at }')
			const { statusCode, payload, message } = await contentStudioService.bulkSchedule(items)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	autoSchedule = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { post_ids, date } = req.body
			if (!post_ids?.length) throw new BadRequestError('post_ids array is required')
			const { statusCode, payload, message } = await contentStudioService.autoSchedule(post_ids, date)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// --- Post Composer ---

	composeEntry = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = composeEntrySchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
			const { statusCode, payload, message } = await contentStudioService.composeEntry(req.params.id, req.user.userId, value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	generatePostContent = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.generatePostContent(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	previewPost = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await contentStudioService.previewPost(req.params.id)
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
}

export default ContentStudioController
