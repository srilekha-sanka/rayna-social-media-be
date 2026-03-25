import { Request, Response, NextFunction } from 'express'
import { socialAccountService } from './social-account.service'
import { getAuthUrlSchema, finalizeConnectionSchema, listAccountsQuerySchema } from './social-account.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class SocialAccountController extends ResponseService {
	constructor() {
		super()
	}

	getAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = getAuthUrlSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = req.user.userId
			const { statusCode, payload, message } = await socialAccountService.getAuthUrl(value, userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	finalizeConnection = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = finalizeConnectionSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const userId = req.user.userId
			const { statusCode, payload, message } = await socialAccountService.finalizeConnection(value, userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAll = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = listAccountsQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await socialAccountService.findAll(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await socialAccountService.findById(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	disconnect = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await socialAccountService.disconnect(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	refreshStatus = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await socialAccountService.refreshStatus(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default SocialAccountController
