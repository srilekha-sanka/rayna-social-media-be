import { WhereOptions } from 'sequelize'
import SocialAccount from './social-account.model'
import User from '../user/user.model'
import { outstandService } from '../outstand/outstand.service'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

const ACCOUNT_INCLUDES = [
	{ model: User, as: 'connector', attributes: ['id', 'email', 'first_name'] },
]

class SocialAccountService {
	/**
	 * Get OAuth URL from Outstand.so for a given platform.
	 */
	async getAuthUrl(data: { platform: string; redirect_url?: string }, userId: string): Promise<IServiceResponse> {
		// Create a pending social account record
		const account = await SocialAccount.create({
			platform: data.platform as any,
			status: 'PENDING',
			connected_by: userId,
		} as any)

		try {
			const { auth_url } = await outstandService.getAuthUrl(data.platform, data.redirect_url)

			return {
				statusCode: 200,
				payload: {
					auth_url,
					account_id: account.id,
					platform: data.platform,
				},
				message: 'OAuth URL generated successfully',
			}
		} catch (err: any) {
			// Clean up pending record on failure
			await account.destroy()
			logger.error(`Failed to get auth URL: ${err.message}`)
			throw new BadRequestError(`Failed to initiate ${data.platform} connection: ${err.message}`)
		}
	}

	/**
	 * Finalize OAuth callback — exchange code for account connection via Outstand.so.
	 */
	async finalizeConnection(
		data: { platform: string; code: string; state?: string },
		userId: string
	): Promise<IServiceResponse> {
		try {
			const outstandAccount = await outstandService.finalizeConnection(data.code, data.platform)

			// Check if account already exists for this platform
			const existing = await SocialAccount.findOne({
				where: {
					platform: data.platform,
					outstand_account_id: outstandAccount.id,
					is_active: true,
				},
			})

			if (existing) {
				// Update existing account
				await existing.update({
					display_name: outstandAccount.display_name,
					username: outstandAccount.username,
					avatar_url: outstandAccount.avatar_url,
					platform_user_id: outstandAccount.platform_user_id,
					status: 'CONNECTED',
					connected_at: new Date(),
				})

				const updated = await SocialAccount.findByPk(existing.id, { include: ACCOUNT_INCLUDES })
				return { statusCode: 200, payload: updated, message: 'Social account reconnected successfully' }
			}

			// Find the pending record or create a new one
			let account = await SocialAccount.findOne({
				where: {
					platform: data.platform,
					status: 'PENDING',
					connected_by: userId,
					is_active: true,
				},
				order: [['createdAt', 'DESC']],
			})

			if (account) {
				await account.update({
					outstand_account_id: outstandAccount.id,
					display_name: outstandAccount.display_name,
					username: outstandAccount.username,
					avatar_url: outstandAccount.avatar_url,
					platform_user_id: outstandAccount.platform_user_id,
					status: 'CONNECTED',
					connected_at: new Date(),
				})
			} else {
				account = await SocialAccount.create({
					platform: data.platform as any,
					outstand_account_id: outstandAccount.id,
					display_name: outstandAccount.display_name,
					username: outstandAccount.username,
					avatar_url: outstandAccount.avatar_url,
					platform_user_id: outstandAccount.platform_user_id,
					status: 'CONNECTED',
					connected_at: new Date(),
					connected_by: userId,
				} as any)
			}

			const full = await SocialAccount.findByPk(account.id, { include: ACCOUNT_INCLUDES })
			return { statusCode: 201, payload: full, message: 'Social account connected successfully' }
		} catch (err: any) {
			logger.error(`Failed to finalize connection: ${err.message}`)
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
	 * Disconnect a social account — removes from Outstand.so and marks as DISCONNECTED locally.
	 */
	async disconnect(id: string): Promise<IServiceResponse> {
		const account = await SocialAccount.findByPk(id)

		if (!account) {
			throw new NotFoundError('Social account not found')
		}

		// Remove from Outstand.so if connected
		if (account.outstand_account_id) {
			try {
				await outstandService.removeAccount(account.outstand_account_id)
			} catch (err: any) {
				logger.error(`Failed to remove from Outstand: ${err.message}`)
				// Continue with local disconnection even if Outstand fails
			}
		}

		await account.update({ status: 'DISCONNECTED' })

		return { statusCode: 200, payload: null, message: 'Social account disconnected successfully' }
	}

	/**
	 * Refresh account health — check status with Outstand.so.
	 */
	async refreshStatus(id: string): Promise<IServiceResponse> {
		const account = await SocialAccount.findByPk(id)

		if (!account) {
			throw new NotFoundError('Social account not found')
		}

		if (!account.outstand_account_id) {
			throw new BadRequestError('Account has no Outstand connection to refresh')
		}

		try {
			const outstandAccount = await outstandService.getAccount(account.outstand_account_id)

			await account.update({
				display_name: outstandAccount.display_name,
				username: outstandAccount.username,
				avatar_url: outstandAccount.avatar_url,
				status: outstandAccount.status === 'active' ? 'CONNECTED' : 'EXPIRED',
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
