import { Request, Response, NextFunction } from 'express'
import { contentService } from './content.service'
import { generateCarouselSchema } from './content.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class ContentController extends ResponseService {
	constructor() {
		super()
	}

	generateCarousel = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = generateCarouselSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const authorId = req.user.userId
			const { statusCode, payload, message } = await contentService.generateCarousel(value, authorId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = contentService.getJobStatus(req.params.jobId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default ContentController
