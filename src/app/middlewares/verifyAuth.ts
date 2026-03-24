import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { NotAuthorizedError } from '../errors/api-errors'
import { ITokenPayload } from '../interfaces/ITokenPayload'
import User from '../module/user/user.model'

const accessTokenSecret = process.env.JWT_ACCESS_SECRET as string

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tokenHeader: string = req.headers['authorization']!

		if (tokenHeader) {
			const token = tokenHeader.split(' ')[1]
			const decoded = jwt.verify(token, accessTokenSecret) as ITokenPayload

			const user = await User.findOne({
				where: { id: decoded.userId, is_active: true },
				attributes: { exclude: ['password'] },
			})

			if (!user) {
				throw new NotAuthorizedError('User not found or deactivated')
			}

			;(req as any).user = decoded
			;(req as any).userData = user
			next()
		} else {
			throw new NotAuthorizedError('Token not provided')
		}
	} catch (err: any) {
		if (err instanceof NotAuthorizedError) {
			return next(err)
		}
		next(new NotAuthorizedError('Invalid or expired token'))
	}
}
