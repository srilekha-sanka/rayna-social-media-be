import { WhereOptions } from 'sequelize'
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
	 * Get OAuth URL from PostForMe for a given platform.
	 */
	async getAuthUrl(data: { platform: string; redirect_url?: string }, userId: string): Promise<IServiceResponse> {
		try {
			const { url } = await postForMeService.getAuthUrl(data.platform)

			return {
				statusCode: 200,
				payload: {
					auth_url: url,
					platform: data.platform,
				},
				message: 'OAuth URL generated successfully',
			}
		} catch (err: any) {
			logger.error(`Failed to get auth URL: ${err.message}`)
			throw new BadRequestError(`Failed to initiate ${data.platform} connection: ${err.message}`)
		}
	}

	/**
	 * Sync accounts from PostForMe after OAuth callback.
	 * PostForMe handles the OAuth exchange internally — we just need to
	 * pull the latest accounts and sync them to our local DB.
	 */
	async finalizeConnection(
		data: { platform: string; code?: string; state?: string },
		userId: string
	): Promise<IServiceResponse> {
		try {
			// PostForMe handles the OAuth exchange; we sync accounts for this platform
			const { data: pfmAccounts } = await postForMeService.listAccounts({
				platform: data.platform,
				status: 'connected',
			})

			if (!pfmAccounts.length) {
				throw new BadRequestError(`No connected ${data.platform} accounts found on PostForMe. Please try connecting again.`)
			}

			const synced: SocialAccount[] = []

			for (const pfmAccount of pfmAccounts) {
				// Check if we already track this PostForMe account
				const existing = await SocialAccount.findOne({
					where: {
						postforme_account_id: pfmAccount.id,
						is_active: true,
					},
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
	 * Sync account(s) from PostForMe OAuth redirect.
	 * Called by the GET /callback handler when PostForMe redirects the browser back.
	 * No userId available (no JWT), so we use a system-level sync.
	 */
	async syncFromRedirect(platform: string, pfmAccountIds: string[]): Promise<void> {
		for (const pfmAccountId of pfmAccountIds) {
			const existing = await SocialAccount.findOne({
				where: { postforme_account_id: pfmAccountId, is_active: true },
			})

			if (existing) {
				// Refresh status
				try {
					const pfmAccount = await postForMeService.getAccount(pfmAccountId)
					await existing.update({
						username: pfmAccount.username || existing.username,
						status: 'CONNECTED',
						connected_at: new Date(),
					})
				} catch (err: any) {
					logger.error(`Failed to refresh account ${pfmAccountId}: ${err.message}`)
				}
			} else {
				try {
					const pfmAccount = await postForMeService.getAccount(pfmAccountId)
					await SocialAccount.create({
						platform: platform as any,
						postforme_account_id: pfmAccount.id,
						username: pfmAccount.username,
						platform_user_id: pfmAccount.external_id,
						status: 'CONNECTED',
						connected_at: new Date(),
						connected_by: '00000000-0000-0000-0000-000000000000', // system sync
					} as any)
				} catch (err: any) {
					logger.error(`Failed to sync account ${pfmAccountId}: ${err.message}`)
				}
			}
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

		const where: WhereOptions = { is_active: true }

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

		// Disconnect from PostForMe if connected
		if (account.postforme_account_id) {
			try {
				await postForMeService.disconnectAccount(account.postforme_account_id)
			} catch (err: any) {
				logger.error(`Failed to disconnect from PostForMe: ${err.message}`)
				// Continue with local disconnection even if PostForMe fails
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
