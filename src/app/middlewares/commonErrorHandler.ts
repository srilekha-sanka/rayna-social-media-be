import { Request, Response, NextFunction } from 'express'
import { logger } from '../common/logger/logging'

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
	const statusCode = err.statusCode || 500
	const message = err.message || 'Internal server error'

	logger.error(`${err.name}: ${message}`)

	return res.status(statusCode).json({
		success: false,
		message,
	})
}
