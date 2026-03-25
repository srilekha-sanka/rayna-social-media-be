import { Request, Response, NextFunction } from 'express'
import { contentService } from './content.service'
import { validateGenerateCarousel } from './content.validator'
import ResponseService from '../../utils/response.service'

class ContentController extends ResponseService {
	constructor() {
		super()
	}

	generateCarousel = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateGenerateCarousel(req.body)
			const authorId = req.user.userId
			const { statusCode, payload, message } = await contentService.generateCarousel(validated, authorId)
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
