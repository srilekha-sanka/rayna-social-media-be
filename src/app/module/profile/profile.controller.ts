import { Request, Response, NextFunction } from 'express'
import { profileService } from './profile.service'
import { updateProfileSchema } from './profile.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class ProfileController extends ResponseService {
	constructor() {
		super()
	}

	getProfile = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = (req as any).user.userId
			const { statusCode, payload, message } = await profileService.getProfile(userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	updateProfile = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = (req as any).user.userId
			const { statusCode, payload, message } = await profileService.updateProfile(userId, value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	updatePhoto = async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.file) throw new BadRequestError('No image file provided')

			const userId = (req as any).user.userId
			const { statusCode, payload, message } = await profileService.updatePhoto(userId, req.file)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	removePhoto = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = (req as any).user.userId
			const { statusCode, payload, message } = await profileService.removePhoto(userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default ProfileController
