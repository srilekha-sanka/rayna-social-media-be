import { WhereOptions, Op } from 'sequelize'
import SocialAccount from './social-account.model'
import User from '../user/user.model'
import { postForMeService } from '../postforme/postforme.service'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

const ACCOUNT_INCLUDES = [
	{ model: User, as: 'connector', attributes: ['id', 'email', 'first_name'] },
]

class SocialAccountService {
	/**
	 * Step 1 of OAuth: Get auth URL from PostForMe.
	 * Creates a PENDING record so we know which user initiated the flow
	 * when PostForMe redirects back (GET callback has no JWT).
	 */
	async getAuthUrl(data: { platform: string; connection_type?: string }, userId: string): Promise<IServiceResponse> {
		try {
			const { url } = await postForMeService.getAuthUrl(data.platform, data.connection_type)

			// Track who started this OAuth flow
			await SocialAccount.create({
				platform: data.platform as any,
				status: 'PENDING',
				connected_by: userId,
			} as any)

			return {
				statusCode: 200,
				payload: { auth_url: url, platform: data.platform },
				message: 'OAuth URL generated successfully',
			}
		} catch (err: any) {
			logger.error(`Failed to get auth URL: ${err.message}`)
			throw new BadRequestError(`Failed to initiate ${data.platform} connection: ${err.message}`)
		}
	}

	/**
	 * Step 2a: Sync from PostForMe browser redirect (GET /callback).
	 * No JWT available — we resolve the user from the most recent PENDING record.
	 * Returns synced accounts for the callback HTML response.
	 */
	async syncFromRedirect(
		platform: string,
		pfmAccountIds: string[]
	): Promise<{ accounts: SocialAccount[]; count: number }> {
		// Find who initiated this OAuth (most recent PENDING record for this platform)
		const pendingRecord = await SocialAccount.findOne({
			where: { platform, status: 'PENDING', is_active: true },
			order: [['createdAt', 'DESC']],
		})

		const connectedBy = pendingRecord?.connected_by

		// Clean up ALL stale PENDING records for this platform (older than 30 min get cleaned too)
		await SocialAccount.destroy({
			where: {
				platform,
				status: 'PENDING',
				is_active: true,
			},
		})

		if (!connectedBy) {
			logger.warn(`[OAuth] No pending record found for ${platform} — cannot attribute connection to user`)
			throw new BadRequestError('OAuth session expired. Please try connecting again from the dashboard.')
		}

		const synced: SocialAccount[] = []

		for (const pfmAccountId of pfmAccountIds) {
			try {
				// Check if we already track this PostForMe account
				const existing = await SocialAccount.findOne({
					where: { postforme_account_id: pfmAccountId, is_active: true },
				})

				if (existing) {
					const pfmAccount = await postForMeService.getAccount(pfmAccountId)
					await existing.update({
						username: pfmAccount.username || existing.username,
						status: 'CONNECTED',
						connected_at: new Date(),
					})
					synced.push(existing)
				} else {
					const pfmAccount = await postForMeService.getAccount(pfmAccountId)
					const account = await SocialAccount.create({
						platform: platform as any,
						postforme_account_id: pfmAccount.id,
						username: pfmAccount.username,
						platform_user_id: pfmAccount.external_id,
						status: 'CONNECTED',
						connected_at: new Date(),
						connected_by: connectedBy,
					} as any)
					synced.push(account)
				}
			} catch (err: any) {
				logger.error(`[OAuth] Failed to sync account ${pfmAccountId}: ${err.message}`)
			}
		}

		return { accounts: synced, count: synced.length }
	}

	/**
	 * Step 2b: Authenticated sync (POST /callback) — called from frontend/curl with JWT.
	 * Pulls all connected accounts for a platform from PostForMe.
	 */
	async finalizeConnection(
		data: { platform: string },
		userId: string
	): Promise<IServiceResponse> {
		try {
			const { data: pfmAccounts } = await postForMeService.listAccounts({
				platform: data.platform,
				status: 'connected',
			})

			if (!pfmAccounts.length) {
				throw new BadRequestError(`No connected ${data.platform} accounts found on PostForMe. Please try connecting again.`)
			}

			const synced: SocialAccount[] = []

			for (const pfmAccount of pfmAccounts) {
				const existing = await SocialAccount.findOne({
					where: { postforme_account_id: pfmAccount.id, is_active: true },
				})

				if (existing) {
					await existing.update({
						username: pfmAccount.username || existing.username,
						status: 'CONNECTED',
						connected_at: new Date(),
					})
					synced.push(existing)
				} else {
					const account = await SocialAccount.create({
						platform: data.platform as any,
						postforme_account_id: pfmAccount.id,
						username: pfmAccount.username,
						platform_user_id: pfmAccount.external_id,
						status: 'CONNECTED',
						connected_at: new Date(),
						connected_by: userId,
					} as any)
					synced.push(account)
				}
			}

			// Clean up any leftover PENDING records
			await SocialAccount.destroy({
				where: { platform: data.platform, status: 'PENDING', connected_by: userId },
			})

			const payload = synced.length === 1
				? await SocialAccount.findByPk(synced[0].id, { include: ACCOUNT_INCLUDES })
				: await SocialAccount.findAll({
						where: { id: synced.map((a) => a.id) },
						include: ACCOUNT_INCLUDES,
					})

			return {
				statusCode: 201,
				payload,
				message: `${synced.length} ${data.platform} account(s) synced successfully`,
			}
		} catch (err: any) {
			if (err instanceof BadRequestError) throw err
			logger.error(`Failed to sync connection: ${err.message}`)
			throw new BadRequestError(`Failed to connect ${data.platform}: ${err.message}`)
		}
	}

	/**
	 * List all social accounts with optional filters.
	 */
	async findAll(query: {
		page: number
		limit: number
		platform?: string
		status?: string
	}): Promise<IServiceResponse> {
		const { page, limit, platform, status } = query
		const offset = (page - 1) * limit

		const where: WhereOptions = { is_active: true, status: { [Op.ne]: 'PENDING' } }

		if (platform) where.platform = platform
		if (status) where.status = status

		const { rows: accounts, count: total } = await SocialAccount.findAndCountAll({
			where,
			limit,
			offset,
			order: [['createdAt', 'DESC']],
			include: ACCOUNT_INCLUDES,
		})

		return {
			statusCode: 200,
			payload: {
				accounts,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Social accounts fetched successfully',
		}
	}

	/**
	 * Get a single social account by ID.
	 */
	async findById(id: string): Promise<IServiceResponse> {
		const account = await SocialAccount.findByPk(id, { include: ACCOUNT_INCLUDES })

		if (!account) {
			throw new NotFoundError('Social account not found')
		}

		return { statusCode: 200, payload: account, message: 'Social account fetched successfully' }
	}

	/**
	 * Disconnect a social account — removes from PostForMe and marks as DISCONNECTED locally.
	 */
	async disconnect(id: string): Promise<IServiceResponse> {
		const account = await SocialAccount.findByPk(id)

		if (!account) {
			throw new NotFoundError('Social account not found')
		}

		if (account.postforme_account_id) {
			try {
				await postForMeService.disconnectAccount(account.postforme_account_id)
			} catch (err: any) {
				logger.error(`Failed to disconnect from PostForMe: ${err.message}`)
			}
		}

		await account.update({ status: 'DISCONNECTED' })

		return { statusCode: 200, payload: null, message: 'Social account disconnected successfully' }
	}

	/**
	 * Refresh account health — check status with PostForMe.
	 */
	async refreshStatus(id: string): Promise<IServiceResponse> {
		const account = await SocialAccount.findByPk(id)

		if (!account) {
			throw new NotFoundError('Social account not found')
		}

		if (!account.postforme_account_id) {
			throw new BadRequestError('Account has no PostForMe connection to refresh')
		}

		try {
			const pfmAccount = await postForMeService.getAccount(account.postforme_account_id)

			await account.update({
				username: pfmAccount.username || account.username,
				status: pfmAccount.status === 'connected' ? 'CONNECTED' : 'EXPIRED',
			})

			const updated = await SocialAccount.findByPk(id, { include: ACCOUNT_INCLUDES })
			return { statusCode: 200, payload: updated, message: 'Account status refreshed' }
		} catch (err: any) {
			await account.update({ status: 'EXPIRED' })
			logger.error(`Failed to refresh account: ${err.message}`)
			throw new BadRequestError(`Failed to refresh account: ${err.message}`)
		}
	}
}

export const socialAccountService = new SocialAccountService()
