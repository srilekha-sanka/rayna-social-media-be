import { BadRequestError } from '../../errors/api-errors'

interface RegisterBody {
	email: string
	password: string
	first_name: string
	last_name?: string
}

interface LoginBody {
	email: string
	password: string
}

interface RefreshTokenBody {
	refresh_token: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export const validateRegister = (body: any): RegisterBody => {
	const { email, password, first_name, last_name } = body

	if (!email || !password || !first_name) {
		throw new BadRequestError('email, password, and first_name are required')
	}

	if (!EMAIL_REGEX.test(email)) {
		throw new BadRequestError('Invalid email format')
	}

	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
	}

	return { email: email.toLowerCase().trim(), password, first_name: first_name.trim(), last_name: last_name?.trim() }
}

export const validateLogin = (body: any): LoginBody => {
	const { email, password } = body

	if (!email || !password) {
		throw new BadRequestError('email and password are required')
	}

	return { email: email.toLowerCase().trim(), password }
}

export const validateRefreshToken = (body: any): RefreshTokenBody => {
	const { refresh_token } = body

	if (!refresh_token) {
		throw new BadRequestError('refresh_token is required')
	}

	return { refresh_token }
}
