import { Request, Response, NextFunction } from 'express'
import { instagramService } from './instagram.service'
import { saveCredentialsSchema, publishPostSchema, getMediaSchema } from './instagram.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class InstagramController extends ResponseService {
	constructor() {
		super()
	}

	// ─── Credentials ───────────────────────────────────────────

	getCredentials = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.user.userId
			const { statusCode, payload, message } = await instagramService.getCredentials(userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	saveCredentials = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = saveCredentialsSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = req.user.userId
			const { statusCode, payload, message } = await instagramService.saveCredentials(
				value.access_token,
				value.ig_user_id,
				userId
			)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	deleteCredentials = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.user.userId
			const { statusCode, payload, message } = await instagramService.deleteCredentials(userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// ─── Publish ───────────────────────────────────────────────

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

	// ─── Media Feed ────────────────────────────────────────────

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
