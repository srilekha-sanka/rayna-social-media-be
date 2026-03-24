import { Request, Response, NextFunction } from 'express'
import { aiService } from './ai.service'
import { validateCaptionRequest, validateHashtagRequest, validateCarouselRequest } from './ai.validator'
import ResponseService from '../../utils/response.service'

class AiController extends ResponseService {
	constructor() {
		super()
	}

	generateCaption = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateCaptionRequest(req.body)
			const { statusCode, payload, message } = await aiService.generateCaption(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	generateHashtags = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateHashtagRequest(req.body)
			const { statusCode, payload, message } = await aiService.generateHashtags(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	generateCarouselContent = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateCarouselRequest(req.body)
			const { statusCode, payload, message } = await aiService.generateCarouselContent(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default AiController
