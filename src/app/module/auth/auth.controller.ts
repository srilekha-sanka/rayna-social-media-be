import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { validateRegister, validateLogin, validateRefreshToken } from './auth.validator'
import ResponseService from '../../utils/response.service'

class AuthController extends ResponseService {
	constructor() {
		super()
	}

	register = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateRegister(req.body)
			const { statusCode, payload, message } = await authService.register(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	login = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateLogin(req.body)
			const { statusCode, payload, message } = await authService.login(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	refreshToken = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { refresh_token } = validateRefreshToken(req.body)
			const { statusCode, payload, message } = await authService.refreshToken(refresh_token)
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
