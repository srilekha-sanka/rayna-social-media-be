import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../user/user.model'
import Role from '../role/role.model'
import { ITokenPayload, ITokenPair } from '../../interfaces/ITokenPayload'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { ConflictError, NotAuthorizedError } from '../../errors/api-errors'

const SALT_ROUNDS = 12
const accessSecret = process.env.JWT_ACCESS_SECRET as string
const refreshSecret = process.env.JWT_REFRESH_SECRET as string
const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m'
const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d'

class AuthService {
	async register(data: {
		email: string
		password: string
		first_name: string
		last_name?: string
	}): Promise<IServiceResponse> {
		const existingUser = await User.findOne({ where: { email: data.email } })

		if (existingUser) {
			throw new ConflictError('Email already registered')
		}

		const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

		// Assign default role — find 'USER' role from DB
		const defaultRole = await Role.findOne({ where: { name: 'USER' } })

		const user = await User.create({
			email: data.email,
			password: hashedPassword,
			first_name: data.first_name,
			last_name: data.last_name,
			role_id: defaultRole?.id,
		})

		const tokens = this.generateTokens({ userId: user.id, roleId: user.role_id || null })

		await user.update({ refresh_token: tokens.refreshToken })

		const safeUser = this.excludeFields(user)

		return { statusCode: 201, payload: { user: safeUser, ...tokens }, message: 'Registration successful' }
	}

	async login(data: { email: string; password: string }): Promise<IServiceResponse> {
		const user = await User.findOne({
			where: { email: data.email, is_active: true },
			include: [Role],
		})

		if (!user) {
			throw new NotAuthorizedError('Invalid email or password')
		}

		const isPasswordValid = await bcrypt.compare(data.password, user.password)

		if (!isPasswordValid) {
			throw new NotAuthorizedError('Invalid email or password')
		}

		const tokens = this.generateTokens({ userId: user.id, roleId: user.role_id || null })

		await user.update({ refresh_token: tokens.refreshToken })

		const safeUser = this.excludeFields(user)

		return { statusCode: 200, payload: { user: safeUser, ...tokens }, message: 'Login successful' }
	}

	async refreshToken(token: string): Promise<IServiceResponse> {
		let decoded: ITokenPayload

		try {
			decoded = jwt.verify(token, refreshSecret) as ITokenPayload
		} catch {
			throw new NotAuthorizedError('Invalid refresh token')
		}

		const user = await User.findOne({ where: { id: decoded.userId, is_active: true } })

		if (!user || user.refresh_token !== token) {
			throw new NotAuthorizedError('Invalid refresh token')
		}

		const tokens = this.generateTokens({ userId: user.id, roleId: user.role_id || null })

		await user.update({ refresh_token: tokens.refreshToken })

		return { statusCode: 200, payload: tokens, message: 'Token refreshed successfully' }
	}

	async logout(userId: string): Promise<IServiceResponse> {
		await User.update({ refresh_token: null }, { where: { id: userId } })

		return { statusCode: 200, payload: null, message: 'Logged out successfully' }
	}

	private generateTokens(payload: ITokenPayload): ITokenPair {
		const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiry as any })
		const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiry as any })

		return { accessToken, refreshToken }
	}

	private excludeFields(user: User) {
		const { password, refresh_token, ...safeUser } = user.toJSON()
		return safeUser
	}
}

export const authService = new AuthService()
