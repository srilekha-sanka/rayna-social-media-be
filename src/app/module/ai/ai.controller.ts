import { Request, Response, NextFunction } from 'express'
import { aiService } from './ai.service'
import { captionRequestSchema, hashtagRequestSchema, carouselRequestSchema } from './ai.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class AiController extends ResponseService {
	constructor() {
		super()
	}

	generateCaption = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = captionRequestSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await aiService.generateCaption(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	generateHashtags = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = hashtagRequestSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await aiService.generateHashtags(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	generateCarouselContent = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = carouselRequestSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await aiService.generateCarouselContent(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default AiController
