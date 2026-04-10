import { Request, Response, NextFunction } from 'express'
import { socialAccountService } from './social-account.service'
import { getAuthUrlSchema, finalizeConnectionSchema, listAccountsQuerySchema } from './social-account.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

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
	 * POST /callback — authenticated sync (called from frontend with JWT).
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
	 *
	 * PostForMe redirects here with query params:
	 *   ?provider=instagram&projectId=proj_xxx&isSuccess=true&accountIds=spc_xxx,spc_yyy
	 *
	 * This handler:
	 *   1. Syncs the account(s) to our DB (matched to the user who initiated via PENDING record)
	 *   2. Returns an HTML page that notifies the opener window via postMessage
	 *   3. Auto-closes the popup (or shows a message if opened as a full tab)
	 */
	handleOAuthRedirect = async (req: Request, res: Response, _next: NextFunction) => {
		const { provider, isSuccess, accountIds } = req.query
		const platform = String(provider || 'unknown')

		// ── Failed OAuth ──────────────────────────────────────────────
		if (isSuccess !== 'true') {
			const errorReason = req.query.error ? String(req.query.error) : 'Unknown error'
			logger.error(`[OAuth Callback] ${platform} failed: ${errorReason}`)

			const message = { type: 'SOCIAL_ACCOUNT_CONNECTED', success: false, platform, error: errorReason }
			return res.status(200).send(this.buildCallbackHtml({
				success: false,
				platform,
				title: 'Connection Failed',
				body: `Could not connect ${platform}: ${errorReason}`,
				postMessage: message,
			}))
		}

		// ── Successful OAuth — sync accounts ─────────────────────────
		let syncResult = { count: 0, accounts: [] as any[] }

		try {
			const accountIdList = accountIds ? String(accountIds).split(',').filter(Boolean) : []

			if (accountIdList.length && provider) {
				syncResult = await socialAccountService.syncFromRedirect(platform, accountIdList)
			}
		} catch (err: any) {
			logger.error(`[OAuth Callback] Sync failed: ${err.message}`)

			const message = { type: 'SOCIAL_ACCOUNT_CONNECTED', success: false, platform, error: err.message }
			return res.status(200).send(this.buildCallbackHtml({
				success: false,
				platform,
				title: 'Sync Failed',
				body: `Account authorized but sync failed: ${err.message}`,
				postMessage: message,
			}))
		}

		const usernames = syncResult.accounts.map((a: any) => a.username).filter(Boolean)
		const message = {
			type: 'SOCIAL_ACCOUNT_CONNECTED',
			success: true,
			platform,
			count: syncResult.count,
			usernames,
		}

		return res.status(200).send(this.buildCallbackHtml({
			success: true,
			platform,
			title: 'Connected!',
			body: usernames.length
				? `Linked <strong>${usernames.join(', ')}</strong> on ${platform}.`
				: `${platform} account connected successfully.`,
			postMessage: message,
		}))
	}

	// ── HTML builder for the OAuth popup callback ────────────────────

	private buildCallbackHtml(opts: {
		success: boolean
		platform: string
		title: string
		body: string
		postMessage: object
	}): string {
		const icon = opts.success ? '&#10003;' : '&#10007;'
		const color = opts.success ? '#22c55e' : '#ef4444'
		const messageJson = JSON.stringify(opts.postMessage)

		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title} — Rayna Social</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #0a0a0a; color: #fafafa;
    }
    .card {
      text-align: center; padding: 48px 40px; max-width: 420px;
      background: #171717; border-radius: 16px;
      border: 1px solid #262626;
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: ${color}20; color: ${color};
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: bold; margin-bottom: 20px;
    }
    h2 { font-size: 22px; margin-bottom: 8px; }
    p { color: #a1a1aa; font-size: 15px; line-height: 1.5; margin-bottom: 16px; }
    .hint { font-size: 13px; color: #52525b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${opts.title}</h2>
    <p>${opts.body}</p>
    <p class="hint" id="hint">Closing this window...</p>
  </div>
  <script>
    (function () {
      var msg = ${messageJson};

      // Notify opener (popup flow) or parent (iframe flow)
      if (window.opener) {
        window.opener.postMessage(msg, '*');
        setTimeout(function () { window.close(); }, 1500);
      } else if (window.parent !== window) {
        window.parent.postMessage(msg, '*');
      } else {
        // Opened as a full tab — can't auto-close
        document.getElementById('hint').textContent = 'You can close this tab now.';
      }
    })();
  </script>
</body>
</html>`
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
