import { Request, Response, NextFunction } from 'express'

const requestCounts = new Map<string, { count: number; resetTime: number }>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS = 100

const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
	const ip = req.ip || req.socket.remoteAddress || 'unknown'
	const now = Date.now()

	const record = requestCounts.get(ip)

	if (!record || now > record.resetTime) {
		requestCounts.set(ip, { count: 1, resetTime: now + WINDOW_MS })
		return next()
	}

	record.count++

	if (record.count > MAX_REQUESTS) {
		return res.status(429).json({
			success: false,
			message: 'Too many requests, please try again later',
		})
	}

	next()
}

export default rateLimiter
