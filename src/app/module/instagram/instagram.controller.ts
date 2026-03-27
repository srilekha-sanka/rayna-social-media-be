import { Request, Response, NextFunction } from 'express'
import { instagramService } from './instagram.service'
import { publishPostSchema, getMediaSchema } from './instagram.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class InstagramController extends ResponseService {
	constructor() {
		super()
	}

	publish = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = publishPostSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = req.user.userId
			const { statusCode, payload, message } = await instagramService.publish(value, userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	publishPost = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.user.userId
			const { statusCode, payload, message } = await instagramService.publishPost(req.params.postId, userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getMedia = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = getMediaSchema.validate(req.query, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = req.user.userId
			const { statusCode, payload, message } = await instagramService.getMedia(userId, value.limit)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default InstagramController
