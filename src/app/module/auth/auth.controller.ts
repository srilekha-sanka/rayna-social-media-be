import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class AuthController extends ResponseService {
	constructor() {
		super()
	}

	register = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = registerSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await authService.register(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	login = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await authService.login(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	refreshToken = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = refreshTokenSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await authService.refreshToken(value.refresh_token)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	logout = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = (req as any).user.userId
			const { statusCode, payload, message } = await authService.logout(userId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default AuthController
