import { Request, Response, NextFunction } from 'express'
import { postService } from './post.service'
import { createPostSchema, updatePostSchema, schedulePostSchema, rejectPostSchema, approvePostSchema } from './post.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class PostController extends ResponseService {
	constructor() {
		super()
	}

	create = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = createPostSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const authorId = req.user.userId
			const { statusCode, payload, message } = await postService.create(value, authorId)
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
				campaign_id: req.query.campaign_id as string | undefined,
				status: req.query.status as string | undefined,
				platform: req.query.platform as string | undefined,
			}
			const { statusCode, payload, message } = await postService.findAll(query)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await postService.findById(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	update = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = updatePostSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await postService.update(req.params.id, value as any)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	delete = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await postService.delete(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	submitForReview = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await postService.submitForReview(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	approve = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = approvePostSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const adminId = req.user.userId
			const { statusCode, payload, message } = await postService.approve(req.params.id, adminId, value.note)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	reject = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = rejectPostSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const adminId = req.user.userId
			const { statusCode, payload, message } = await postService.reject(req.params.id, adminId, value.reason)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	publish = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await postService.publish(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	schedule = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = schedulePostSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await postService.schedule(req.params.id, value.scheduled_at)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default PostController
