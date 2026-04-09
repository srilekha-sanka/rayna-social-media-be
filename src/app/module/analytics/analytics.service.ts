import { Op, fn, col, literal, WhereOptions } from 'sequelize'
import PostAnalytics from './post-analytics.model'
import Post from '../post/post.model'
import Campaign from '../campaign/campaign.model'
import Product from '../product/product.model'
import User from '../user/user.model'
import SocialAccount from '../social-account/social-account.model'
import { postForMeService } from '../postforme/postforme.service'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

// ── Types ───────────────────────────────────────────────────────────

interface DateRange {
	from?: string // ISO date
	to?: string   // ISO date
}

interface AnalyticsQuery extends DateRange {
	page?: number
	limit?: number
	platform?: string
	sort_by?: string
	sort_order?: 'ASC' | 'DESC'
}

// ── Service ─────────────────────────────────────────────────────────

class AnalyticsService {
	// ── Sync: Pull metrics from PostForMe into local DB ──────────────

	/**
	 * Sync analytics for a single post.
	 * Calls PostForMe to get per-platform results + metrics, upserts into PostAnalytics.
	 */
	async syncPostAnalytics(postId: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(postId)
		if (!post) throw new NotFoundError('Post not found')

		if (!post.postforme_post_id) {
			throw new BadRequestError('Post has no PostForMe ID — it may not have been published yet')
		}

		try {
			// 1. Get all platform results for this post
			const results = await postForMeService.getPostResults(post.postforme_post_id)

			if (!results.data?.length) {
				return { statusCode: 200, payload: [], message: 'No platform results found for this post' }
			}

			const synced: PostAnalytics[] = []

			for (const result of results.data) {
				if (!result.success) continue

				// 2. Get detailed analytics for each platform result
				let analytics: any = {}
				try {
					const details = await postForMeService.getPostResultDetails(result.id)
					analytics = details.analytics || {}
				} catch (err: any) {
					logger.warn(`Could not fetch analytics for result ${result.id}: ${err.message}`)
					// Fall back to whatever is in details
					analytics = (result.details as any) || {}
				}

				// 3. Resolve the local social account from PFM account ID
				const socialAccount = await SocialAccount.findOne({
					where: { postforme_account_id: result.social_account_id, is_active: true },
				})

				const platform = socialAccount?.platform || 'unknown'
				const totalEngagement = (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0)
				const engagementRate =
					analytics.engagement_rate ??
					(analytics.impressions > 0 ? (totalEngagement / analytics.impressions) * 100 : 0)

				// 4. Upsert: update if exists, create if not
				const [record] = await PostAnalytics.upsert(
					{
						post_id: postId,
						platform,
						social_account_id: socialAccount?.id || null,
						platform_post_id: result.platform_data?.id || null,
						platform_post_url: result.platform_data?.url || null,
						likes: analytics.likes || 0,
						comments: analytics.comments || 0,
						shares: analytics.shares || 0,
						saves: analytics.saves || 0,
						reach: analytics.reach || 0,
						impressions: analytics.impressions || 0,
						clicks: analytics.clicks || 0,
						engagement_rate: Math.round(engagementRate * 100) / 100,
						video_views: analytics.video_views || 0,
						watch_time_seconds: analytics.watch_time_seconds || 0,
						raw_metrics: analytics,
						last_synced_at: new Date(),
					} as any,
					{ returning: true }
				)

				synced.push(record)
			}

			logger.info(`[Analytics] Synced ${synced.length} platform result(s) for post ${postId}`)

			return {
				statusCode: 200,
				payload: synced,
				message: `Analytics synced for ${synced.length} platform(s)`,
			}
		} catch (err: any) {
			logger.error(`[Analytics] Sync failed for post ${postId}: ${err.message}`)
			throw new BadRequestError(`Analytics sync failed: ${err.message}`)
		}
	}

	/**
	 * Bulk sync: refresh analytics for all recently published posts.
	 * Called by the scheduler cron job.
	 */
	async syncRecentPosts(daysBack: number = 7): Promise<number> {
		const cutoff = new Date()
		cutoff.setDate(cutoff.getDate() - daysBack)

		const posts = await Post.findAll({
			where: {
				status: 'PUBLISHED',
				postforme_post_id: { [Op.ne]: null },
				published_at: { [Op.gte]: cutoff },
				is_active: true,
			},
			attributes: ['id'],
		})

		let syncedCount = 0

		for (const post of posts) {
			try {
				await this.syncPostAnalytics(post.id)
				syncedCount++
			} catch (err: any) {
				logger.warn(`[Analytics] Skipping post ${post.id}: ${err.message}`)
			}
		}

		logger.info(`[Analytics] Bulk sync complete: ${syncedCount}/${posts.length} posts refreshed`)
		return syncedCount
	}

	// ── Query: Single Post Analytics ─────────────────────────────────

	async getPostAnalytics(postId: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(postId, {
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal'] },
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})

		if (!post) throw new NotFoundError('Post not found')

		const platformMetrics = await PostAnalytics.findAll({
			where: { post_id: postId, is_active: true },
			include: [{ model: SocialAccount, attributes: ['id', 'platform', 'display_name', 'username', 'avatar_url'] }],
			order: [['impressions', 'DESC']],
		})

		// Aggregate totals across all platforms
		const totals = platformMetrics.reduce(
			(acc, m) => ({
				likes: acc.likes + m.likes,
				comments: acc.comments + m.comments,
				shares: acc.shares + m.shares,
				saves: acc.saves + m.saves,
				reach: acc.reach + m.reach,
				impressions: acc.impressions + m.impressions,
				clicks: acc.clicks + m.clicks,
				video_views: acc.video_views + m.video_views,
			}),
			{ likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0, clicks: 0, video_views: 0 }
		)

		const totalEngagement = totals.likes + totals.comments + totals.shares
		const avgEngagementRate =
			totals.impressions > 0 ? Math.round((totalEngagement / totals.impressions) * 100 * 100) / 100 : 0

		return {
			statusCode: 200,
			payload: {
				post: {
					id: post.id,
					base_content: post.base_content,
					platforms: post.platforms,
					media_urls: post.media_urls,
					status: post.status,
					published_at: post.published_at,
					campaign: (post as any).campaign,
					author: (post as any).author,
				},
				totals: { ...totals, engagement_rate: avgEngagementRate },
				platforms: platformMetrics,
				last_synced_at: platformMetrics.length
					? platformMetrics.reduce((latest, m) =>
							m.last_synced_at > latest ? m.last_synced_at : latest, platformMetrics[0].last_synced_at)
					: null,
			},
			message: 'Post analytics fetched',
		}
	}

	// ── Query: Campaign Analytics ────────────────────────────────────

	async getCampaignAnalytics(campaignId: string, query: DateRange = {}): Promise<IServiceResponse> {
		const campaign = await Campaign.findByPk(campaignId, {
			include: [{ model: Product, attributes: ['id', 'name', 'price'] }],
		})

		if (!campaign) throw new NotFoundError('Campaign not found')

		// Get all published posts for this campaign
		const postWhere: WhereOptions = {
			campaign_id: campaignId,
			status: 'PUBLISHED',
			is_active: true,
		}

		if (query.from || query.to) {
			postWhere.published_at = {}
			if (query.from) (postWhere.published_at as any)[Op.gte] = new Date(query.from)
			if (query.to) (postWhere.published_at as any)[Op.lte] = new Date(query.to)
		}

		const posts = await Post.findAll({
			where: postWhere,
			attributes: ['id', 'base_content', 'platforms', 'media_urls', 'published_at', 'status'],
			order: [['published_at', 'DESC']],
		})

		const postIds = posts.map((p) => p.id)

		// Get aggregated analytics for all posts in the campaign
		const analytics = postIds.length
			? await PostAnalytics.findAll({
					where: { post_id: { [Op.in]: postIds }, is_active: true },
				})
			: []

		// Aggregate totals
		const totals = analytics.reduce(
			(acc, m) => ({
				likes: acc.likes + m.likes,
				comments: acc.comments + m.comments,
				shares: acc.shares + m.shares,
				saves: acc.saves + m.saves,
				reach: acc.reach + m.reach,
				impressions: acc.impressions + m.impressions,
				clicks: acc.clicks + m.clicks,
				video_views: acc.video_views + m.video_views,
			}),
			{ likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0, clicks: 0, video_views: 0 }
		)

		const totalEngagement = totals.likes + totals.comments + totals.shares
		const avgEngagementRate =
			totals.impressions > 0 ? Math.round((totalEngagement / totals.impressions) * 100 * 100) / 100 : 0

		// Per-platform breakdown
		const platformMap = new Map<string, typeof totals>()
		for (const m of analytics) {
			const existing = platformMap.get(m.platform) || {
				likes: 0, comments: 0, shares: 0, saves: 0,
				reach: 0, impressions: 0, clicks: 0, video_views: 0,
			}
			platformMap.set(m.platform, {
				likes: existing.likes + m.likes,
				comments: existing.comments + m.comments,
				shares: existing.shares + m.shares,
				saves: existing.saves + m.saves,
				reach: existing.reach + m.reach,
				impressions: existing.impressions + m.impressions,
				clicks: existing.clicks + m.clicks,
				video_views: existing.video_views + m.video_views,
			})
		}

		const platformBreakdown = Array.from(platformMap.entries()).map(([platform, metrics]) => {
			const eng = metrics.likes + metrics.comments + metrics.shares
			return {
				platform,
				...metrics,
				engagement_rate: metrics.impressions > 0 ? Math.round((eng / metrics.impressions) * 100 * 100) / 100 : 0,
			}
		})

		// Best performing post (by total engagement)
		const postEngagementMap = new Map<string, number>()
		for (const m of analytics) {
			const current = postEngagementMap.get(m.post_id) || 0
			postEngagementMap.set(m.post_id, current + m.likes + m.comments + m.shares)
		}

		let bestPostId: string | null = null
		let bestEngagement = 0
		for (const [pid, eng] of postEngagementMap) {
			if (eng > bestEngagement) {
				bestPostId = pid
				bestEngagement = eng
			}
		}

		const bestPost = bestPostId ? posts.find((p) => p.id === bestPostId) : null

		return {
			statusCode: 200,
			payload: {
				campaign: {
					id: campaign.id,
					name: campaign.name,
					goal: campaign.goal,
					status: campaign.status,
					product: (campaign as any).Product,
				},
				total_posts: posts.length,
				totals: { ...totals, engagement_rate: avgEngagementRate },
				platform_breakdown: platformBreakdown,
				best_post: bestPost
					? { id: bestPost.id, base_content: bestPost.base_content, total_engagement: bestEngagement }
					: null,
				posts: posts.map((p) => {
					const postMetrics = analytics.filter((a) => a.post_id === p.id)
					const postTotalEng = postMetrics.reduce((s, m) => s + m.likes + m.comments + m.shares, 0)
					const postImpressions = postMetrics.reduce((s, m) => s + m.impressions, 0)
					return {
						id: p.id,
						base_content: p.base_content,
						platforms: p.platforms,
						published_at: p.published_at,
						total_engagement: postTotalEng,
						impressions: postImpressions,
						engagement_rate:
							postImpressions > 0 ? Math.round((postTotalEng / postImpressions) * 100 * 100) / 100 : 0,
					}
				}),
			},
			message: 'Campaign analytics fetched',
		}
	}

	// ── Query: Dashboard Overview ────────────────────────────────────

	async getOverview(query: DateRange = {}): Promise<IServiceResponse> {
		const postWhere: WhereOptions = { is_active: true }
		const analyticsWhere: WhereOptions = { is_active: true }

		if (query.from || query.to) {
			const dateFilter: any = {}
			if (query.from) dateFilter[Op.gte] = new Date(query.from)
			if (query.to) dateFilter[Op.lte] = new Date(query.to)
			postWhere.published_at = dateFilter
		}

		// Post status counts
		const statusCounts = await Post.findAll({
			where: { is_active: true },
			attributes: ['status', [fn('COUNT', col('id')), 'count']],
			group: ['status'],
			raw: true,
		})

		const statusMap: Record<string, number> = {}
		for (const row of statusCounts as any[]) {
			statusMap[row.status] = parseInt(row.count, 10)
		}

		// Published posts within date range
		const publishedPosts = await Post.findAll({
			where: { ...postWhere, status: 'PUBLISHED' },
			attributes: ['id'],
		})

		const publishedIds = publishedPosts.map((p) => p.id)

		if (publishedIds.length) {
			analyticsWhere.post_id = { [Op.in]: publishedIds }
		}

		// Aggregate analytics
		const allAnalytics = publishedIds.length
			? await PostAnalytics.findAll({ where: analyticsWhere, raw: true })
			: []

		const totals = (allAnalytics as any[]).reduce(
			(acc, m) => ({
				likes: acc.likes + (m.likes || 0),
				comments: acc.comments + (m.comments || 0),
				shares: acc.shares + (m.shares || 0),
				saves: acc.saves + (m.saves || 0),
				reach: acc.reach + (m.reach || 0),
				impressions: acc.impressions + (m.impressions || 0),
				clicks: acc.clicks + (m.clicks || 0),
				video_views: acc.video_views + (m.video_views || 0),
			}),
			{ likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0, clicks: 0, video_views: 0 }
		)

		const totalEngagement = totals.likes + totals.comments + totals.shares
		const avgEngagementRate =
			totals.impressions > 0 ? Math.round((totalEngagement / totals.impressions) * 100 * 100) / 100 : 0

		// Platform distribution (how many posts per platform)
		const platformDistribution = (allAnalytics as any[]).reduce((acc: Record<string, number>, m) => {
			acc[m.platform] = (acc[m.platform] || 0) + 1
			return acc
		}, {})

		return {
			statusCode: 200,
			payload: {
				posts: {
					total: Object.values(statusMap).reduce((s, c) => s + c, 0),
					by_status: statusMap,
					published_in_range: publishedIds.length,
				},
				totals: { ...totals, engagement_rate: avgEngagementRate },
				platform_distribution: platformDistribution,
			},
			message: 'Analytics overview fetched',
		}
	}

	// ── Query: Platform Breakdown ────────────────────────────────────

	async getPlatformBreakdown(query: DateRange = {}): Promise<IServiceResponse> {
		const analyticsWhere: WhereOptions = { is_active: true }

		if (query.from || query.to) {
			// Filter by post published_at
			const postWhere: WhereOptions = { status: 'PUBLISHED', is_active: true }
			const dateFilter: any = {}
			if (query.from) dateFilter[Op.gte] = new Date(query.from)
			if (query.to) dateFilter[Op.lte] = new Date(query.to)
			postWhere.published_at = dateFilter

			const posts = await Post.findAll({ where: postWhere, attributes: ['id'] })
			analyticsWhere.post_id = { [Op.in]: posts.map((p) => p.id) }
		}

		const analytics = await PostAnalytics.findAll({ where: analyticsWhere, raw: true })

		const platformMap = new Map<string, any>()

		for (const m of analytics as any[]) {
			const existing = platformMap.get(m.platform) || {
				platform: m.platform,
				post_count: new Set(),
				likes: 0, comments: 0, shares: 0, saves: 0,
				reach: 0, impressions: 0, clicks: 0, video_views: 0,
			}

			existing.post_count.add(m.post_id)
			existing.likes += m.likes || 0
			existing.comments += m.comments || 0
			existing.shares += m.shares || 0
			existing.saves += m.saves || 0
			existing.reach += m.reach || 0
			existing.impressions += m.impressions || 0
			existing.clicks += m.clicks || 0
			existing.video_views += m.video_views || 0

			platformMap.set(m.platform, existing)
		}

		const platforms = Array.from(platformMap.values()).map((p) => {
			const totalEngagement = p.likes + p.comments + p.shares
			return {
				platform: p.platform,
				post_count: p.post_count.size,
				likes: p.likes,
				comments: p.comments,
				shares: p.shares,
				saves: p.saves,
				reach: p.reach,
				impressions: p.impressions,
				clicks: p.clicks,
				video_views: p.video_views,
				engagement_rate: p.impressions > 0 ? Math.round((totalEngagement / p.impressions) * 100 * 100) / 100 : 0,
			}
		})

		// Sort by total engagement descending
		platforms.sort((a, b) => {
			const engA = a.likes + a.comments + a.shares
			const engB = b.likes + b.comments + b.shares
			return engB - engA
		})

		return { statusCode: 200, payload: { platforms }, message: 'Platform breakdown fetched' }
	}

	// ── Query: Top Posts ─────────────────────────────────────────────

	async getTopPosts(query: AnalyticsQuery = {}): Promise<IServiceResponse> {
		const {
			page = 1,
			limit = 10,
			platform,
			sort_by = 'engagement',
			sort_order = 'DESC',
			from,
			to,
		} = query

		const offset = (page - 1) * limit

		// Build post filter
		const postWhere: WhereOptions = { status: 'PUBLISHED', is_active: true }
		if (from || to) {
			const dateFilter: any = {}
			if (from) dateFilter[Op.gte] = new Date(from)
			if (to) dateFilter[Op.lte] = new Date(to)
			postWhere.published_at = dateFilter
		}

		const posts = await Post.findAll({
			where: postWhere,
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal'] },
				{ model: User, as: 'author', attributes: ['id', 'first_name'] },
			],
		})

		if (!posts.length) {
			return {
				statusCode: 200,
				payload: { posts: [], pagination: { page, limit, total: 0, totalPages: 0 } },
				message: 'No published posts found',
			}
		}

		// Get analytics for all these posts
		const analyticsWhere: WhereOptions = {
			post_id: { [Op.in]: posts.map((p) => p.id) },
			is_active: true,
		}
		if (platform) analyticsWhere.platform = platform

		const analytics = await PostAnalytics.findAll({ where: analyticsWhere, raw: true })

		// Aggregate per post
		const postMetricsMap = new Map<string, any>()
		for (const m of analytics as any[]) {
			const existing = postMetricsMap.get(m.post_id) || {
				likes: 0, comments: 0, shares: 0, saves: 0,
				reach: 0, impressions: 0, clicks: 0, video_views: 0,
				platform_count: 0,
			}
			existing.likes += m.likes || 0
			existing.comments += m.comments || 0
			existing.shares += m.shares || 0
			existing.saves += m.saves || 0
			existing.reach += m.reach || 0
			existing.impressions += m.impressions || 0
			existing.clicks += m.clicks || 0
			existing.video_views += m.video_views || 0
			existing.platform_count += 1
			postMetricsMap.set(m.post_id, existing)
		}

		// Build ranked list
		let ranked = posts.map((p) => {
			const metrics = postMetricsMap.get(p.id) || {
				likes: 0, comments: 0, shares: 0, saves: 0,
				reach: 0, impressions: 0, clicks: 0, video_views: 0,
				platform_count: 0,
			}
			const totalEngagement = metrics.likes + metrics.comments + metrics.shares
			const engagementRate =
				metrics.impressions > 0 ? Math.round((totalEngagement / metrics.impressions) * 100 * 100) / 100 : 0

			return {
				id: p.id,
				base_content: p.base_content,
				platforms: p.platforms,
				media_urls: p.media_urls,
				published_at: p.published_at,
				campaign: (p as any).campaign,
				author: (p as any).author,
				metrics: { ...metrics, engagement_rate: engagementRate, total_engagement: totalEngagement },
			}
		})

		// Sort
		const sortKey = sort_by === 'engagement' ? 'total_engagement' : sort_by
		ranked.sort((a, b) => {
			const valA = (a.metrics as any)[sortKey] || 0
			const valB = (b.metrics as any)[sortKey] || 0
			return sort_order === 'DESC' ? valB - valA : valA - valB
		})

		const total = ranked.length
		ranked = ranked.slice(offset, offset + limit)

		return {
			statusCode: 200,
			payload: {
				posts: ranked,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Top posts fetched',
		}
	}

	// ── Query: Account Feed Analytics ────────────────────────────────

	async getAccountFeedAnalytics(
		accountId: string,
		options?: { limit?: number; cursor?: string }
	): Promise<IServiceResponse> {
		const account = await SocialAccount.findByPk(accountId)
		if (!account) throw new NotFoundError('Social account not found')

		if (!account.postforme_account_id) {
			throw new BadRequestError('Account is not linked to PostForMe')
		}

		try {
			const feed = await postForMeService.getAccountFeedWithMetrics(account.postforme_account_id, options)

			return {
				statusCode: 200,
				payload: {
					account: {
						id: account.id,
						platform: account.platform,
						display_name: account.display_name,
						username: account.username,
						avatar_url: account.avatar_url,
					},
					feed: feed.data,
					meta: feed.meta,
				},
				message: 'Account feed analytics fetched',
			}
		} catch (err: any) {
			logger.error(`[Analytics] Failed to fetch feed for account ${accountId}: ${err.message}`)
			throw new BadRequestError(`Failed to fetch feed analytics: ${err.message}`)
		}
	}
}

export const analyticsService = new AnalyticsService()
