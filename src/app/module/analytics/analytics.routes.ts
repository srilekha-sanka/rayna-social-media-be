import { Router } from 'express'
import AnalyticsController from './analytics.controller'

const analyticsController = new AnalyticsController()
const analyticsRouter = Router()

// Full dashboard (stats + connected platforms + recent posts)
analyticsRouter.get('/dashboard', analyticsController.getDashboard)

// Dashboard overview
analyticsRouter.get('/overview', analyticsController.getOverview)

// Platform breakdown
analyticsRouter.get('/platforms', analyticsController.getPlatformBreakdown)

// Top performing posts
analyticsRouter.get('/top-posts', analyticsController.getTopPosts)

// Campaign-level analytics
analyticsRouter.get('/campaigns/:campaignId', analyticsController.getCampaignAnalytics)

// Single post analytics
analyticsRouter.get('/posts/:postId', analyticsController.getPostAnalytics)

// Manual sync trigger
analyticsRouter.post('/sync/:postId', analyticsController.syncPost)

// Account feed analytics (from PostForMe)
analyticsRouter.get('/accounts/:accountId/feed', analyticsController.getAccountFeed)

export { analyticsRouter }
