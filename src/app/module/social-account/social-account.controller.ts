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

	/**
	 * POST /callback — authenticated sync (called via curl/frontend).
	 */
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

	/**
	 * GET /callback — browser redirect from PostForMe after OAuth.
	 * Query params: provider, projectId, isSuccess, accountIds
	 * No JWT available (browser redirect), so we sync the account and show a success page.
	 */
	handleOAuthRedirect = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { provider, isSuccess, accountIds } = req.query

			if (isSuccess !== 'true') {
				return res.status(400).send(
					'<html><body style="font-family:sans-serif;text-align:center;padding:60px;">' +
					'<h2>Connection Failed</h2>' +
					'<p>The social account connection was not successful. Please try again.</p>' +
					'</body></html>'
				)
			}

			// Sync the account(s) from PostForMe using the accountIds from the redirect
			const accountIdList = accountIds ? String(accountIds).split(',') : []

			if (accountIdList.length && provider) {
				await socialAccountService.syncFromRedirect(
					String(provider),
					accountIdList
				)
			}

			return res.status(200).send(
				'<html><body style="font-family:sans-serif;text-align:center;padding:60px;">' +
				`<h2>Connected Successfully!</h2>` +
				`<p>Your <strong>${provider}</strong> account has been linked.</p>` +
				'<p>You can close this tab now.</p>' +
				'</body></html>'
			)
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
