import { Request, Response, NextFunction } from 'express'
import { analyticsService } from './analytics.service'
import { dateRangeSchema, topPostsQuerySchema, accountFeedQuerySchema } from './analytics.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class AnalyticsController extends ResponseService {
	constructor() {
		super()
	}

	// POST /analytics/sync/:postId — manually refresh analytics for a post
	syncPost = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await analyticsService.syncPostAnalytics(req.params.postId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// GET /analytics/posts/:postId — single post analytics
	getPostAnalytics = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await analyticsService.getPostAnalytics(req.params.postId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// GET /analytics/campaigns/:campaignId — campaign-level analytics
	getCampaignAnalytics = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = dateRangeSchema.validate(req.query, { stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await analyticsService.getCampaignAnalytics(
				req.params.campaignId,
				value
			)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// GET /analytics/overview — dashboard overview
	getOverview = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = dateRangeSchema.validate(req.query, { stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await analyticsService.getOverview(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// GET /analytics/platforms — per-platform breakdown
	getPlatformBreakdown = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = dateRangeSchema.validate(req.query, { stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await analyticsService.getPlatformBreakdown(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// GET /analytics/top-posts — ranked posts by engagement
	getTopPosts = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = topPostsQuerySchema.validate(req.query, { stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await analyticsService.getTopPosts(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	// GET /analytics/accounts/:accountId/feed — account feed with metrics
	getAccountFeed = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = accountFeedQuerySchema.validate(req.query, { stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await analyticsService.getAccountFeedAnalytics(
				req.params.accountId,
				value
			)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default AnalyticsController
