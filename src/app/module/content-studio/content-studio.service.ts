import { Op, WhereOptions } from 'sequelize'
import ContentPlan, { ContentPlanStatus, VALID_POST_TYPES } from './content-plan.model'
import CalendarEntry, { EntryContentType } from './calendar-entry.model'
import Product from '../product/product.model'
import Campaign from '../campaign/campaign.model'
import Post from '../post/post.model'
import User from '../user/user.model'
import Brand from '../brand/brand.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { aiService } from '../ai/ai.service'
import { contentService } from '../content/content.service'

// --- Types ---

interface GeneratePlanInput {
	name: string
	brand_id?: string
	start_date: string
	end_date: string
	platforms: string[]
	product_ids?: string[]
	include_festivals: boolean
	include_engagement: boolean
	posts_per_day: number
	tone: string
	target_audience: string
	primary_goal: string
	region: string
	language: string
	post_types: string[]
	special_notes?: string
}

type GenerateEntriesInput = Omit<GeneratePlanInput, 'name' | 'start_date' | 'end_date' | 'brand_id'> & { skip_existing_dates: boolean }

interface AIPlanEntry {
	date: string
	title: string
	description: string
	content_type: EntryContentType
	post_type: string
	platform: string
	product_id?: string
	ai_rationale: string
}

interface AIPostContent {
	caption: string
	hashtags: string[]
	cta_text: string
}

interface CalendarQuery {
	start_date: string
	end_date: string
	platform?: string
	content_type?: string
	status?: string
	content_plan_id?: string
}

type JobStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface Job {
	status: JobStatus
	result?: any
	error?: string
	started_at: Date
	completed_at?: Date
	progress?: { completed: number; total: number }
}

// --- Job Store ---

const jobStore = new Map<string, Job>()
const MAX_BATCH_DAYS = 7

class ContentStudioService {
	// --- Async Plan Generation ---

	async generatePlan(input: GeneratePlanInput, userId: string): Promise<IServiceResponse> {
		const products = await this.fetchProducts(input.product_ids)
		if (!products.length) throw new BadRequestError('No products found. At least one product is required.')

		const plan = await ContentPlan.create({
			name: input.name,
			brand_id: input.brand_id || undefined,
			start_date: new Date(input.start_date),
			end_date: new Date(input.end_date),
			language: input.language,
			post_types: input.post_types,
			created_by: userId,
			generation_config: {
				platforms: input.platforms,
				product_ids: input.product_ids,
				include_festivals: input.include_festivals,
				include_engagement: input.include_engagement,
				posts_per_day: input.posts_per_day,
				tone: input.tone,
				primary_goal: input.primary_goal,
				language: input.language,
				post_types: input.post_types,
			},
		} as any)

		const jobId = `plan-${plan.id}-${Date.now()}`
		jobStore.set(jobId, { status: 'PROCESSING', started_at: new Date(), progress: { completed: 0, total: 0 } })

		this.processGeneratePlan(jobId, plan.id, input, products).catch((err) => {
			jobStore.set(jobId, { status: 'FAILED', error: err.message, started_at: jobStore.get(jobId)!.started_at, completed_at: new Date() })
		})

		return {
			statusCode: 202,
			payload: { job_id: jobId, plan_id: plan.id, status: 'PROCESSING' },
			message: 'Plan creation started. Poll job status for updates.',
		}
	}

	async generateEntriesForPlan(planId: string, input: GenerateEntriesInput): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(planId)
		if (!plan) throw new NotFoundError('Content plan not found')

		const products = await this.fetchProducts(input.product_ids)
		if (!products.length) throw new BadRequestError('No products found to generate content.')

		const jobId = `fill-${planId}-${Date.now()}`
		jobStore.set(jobId, { status: 'PROCESSING', started_at: new Date(), progress: { completed: 0, total: 0 } })

		this.processGenerateEntries(jobId, plan, input, products).catch((err) => {
			jobStore.set(jobId, { status: 'FAILED', error: err.message, started_at: jobStore.get(jobId)!.started_at, completed_at: new Date() })
		})

		return {
			statusCode: 202,
			payload: { job_id: jobId, plan_id: planId, status: 'PROCESSING' },
			message: 'Entry generation started. Poll job status for updates.',
		}
	}

	async getJobStatus(jobId: string): Promise<IServiceResponse> {
		const job = jobStore.get(jobId)
		if (!job) throw new NotFoundError('Job not found')

		const payload: any = { job_id: jobId, status: job.status, started_at: job.started_at, progress: job.progress }
		if (job.status === 'COMPLETED') {
			payload.result = job.result
			payload.completed_at = job.completed_at
		}
		if (job.status === 'FAILED') {
			payload.error = job.error
			payload.completed_at = job.completed_at
		}

		return { statusCode: 200, payload, message: `Job ${job.status.toLowerCase()}` }
	}

	// --- Async processors ---

	private async processGeneratePlan(jobId: string, planId: string, input: GeneratePlanInput, products: Product[]) {
		const activeCampaigns = await this.fetchActiveCampaigns(input.start_date, input.end_date)
		const batches = this.splitDateRange(input.start_date, input.end_date, MAX_BATCH_DAYS)

		const job = jobStore.get(jobId)!
		job.progress = { completed: 0, total: batches.length }

		const allEntries: AIPlanEntry[] = []

		for (let i = 0; i < batches.length; i++) {
			const batch = batches[i]
			const batchInput = { ...input, start_date: batch.start, end_date: batch.end }
			const entries = await this.callAIForPlan(batchInput, products, activeCampaigns)
			allEntries.push(...entries)
			job.progress = { completed: i + 1, total: batches.length }
		}

		await CalendarEntry.bulkCreate(
			allEntries.map((entry) => ({
				content_plan_id: planId,
				date: new Date(entry.date),
				title: entry.title,
				description: entry.description,
				content_type: entry.content_type,
				post_type: entry.post_type || 'image',
				language: input.language,
				platform: entry.platform,
				product_id: entry.product_id || undefined,
				campaign_id: this.matchCampaign(entry, activeCampaigns),
				ai_rationale: entry.ai_rationale,
			})) as any[]
		)

		const fullPlan = await this.findPlanById(planId)

		jobStore.set(jobId, {
			status: 'COMPLETED',
			result: { plan: fullPlan, entries_added: allEntries.length },
			started_at: job.started_at,
			completed_at: new Date(),
			progress: { completed: batches.length, total: batches.length },
		})
	}

	private async processGenerateEntries(jobId: string, plan: ContentPlan, input: GenerateEntriesInput, products: Product[]) {
		const startDate = String(plan.start_date)
		const endDate = String(plan.end_date)

		const existingEntries = await CalendarEntry.findAll({
			where: { content_plan_id: plan.id, is_active: true },
			attributes: ['date', 'platform'],
		})
		const coveredSlots = new Set(existingEntries.map((e) => `${e.date}_${e.platform}`))

		const activeCampaigns = await this.fetchActiveCampaigns(startDate, endDate)
		const batches = this.splitDateRange(startDate, endDate, MAX_BATCH_DAYS)

		const job = jobStore.get(jobId)!
		job.progress = { completed: 0, total: batches.length }

		const fullInput: GeneratePlanInput = { ...input, name: plan.name, start_date: startDate, end_date: endDate }
		let totalAdded = 0

		for (let i = 0; i < batches.length; i++) {
			const batch = batches[i]
			const batchInput = { ...fullInput, start_date: batch.start, end_date: batch.end }
			const aiEntries = await this.callAIForPlan(batchInput, products, activeCampaigns)

			const filtered = input.skip_existing_dates
				? aiEntries.filter((e) => !coveredSlots.has(`${e.date}_${e.platform}`))
				: aiEntries

			if (filtered.length) {
				await CalendarEntry.bulkCreate(
					filtered.map((entry) => ({
						content_plan_id: plan.id,
						date: new Date(entry.date),
						title: entry.title,
						description: entry.description,
						content_type: entry.content_type,
						post_type: entry.post_type || 'image',
						language: input.language,
						platform: entry.platform,
						product_id: entry.product_id || undefined,
						campaign_id: this.matchCampaign(entry, activeCampaigns),
						ai_rationale: entry.ai_rationale,
					})) as any[]
				)
				filtered.forEach((e) => coveredSlots.add(`${e.date}_${e.platform}`))
				totalAdded += filtered.length
			}

			job.progress = { completed: i + 1, total: batches.length }
		}

		const fullPlan = await this.findPlanById(plan.id)

		jobStore.set(jobId, {
			status: 'COMPLETED',
			result: { plan: fullPlan, entries_added: totalAdded },
			started_at: job.started_at,
			completed_at: new Date(),
			progress: { completed: batches.length, total: batches.length },
		})
	}

	// --- Content Plans CRUD ---

	async findAllPlans(query: { page: number; limit: number; status?: string }): Promise<IServiceResponse> {
		const { page, limit, status } = query
		const where: WhereOptions = { is_active: true }
		if (status) (where as any).status = status

		const { rows: plans, count: total } = await ContentPlan.findAndCountAll({
			where,
			limit,
			offset: (page - 1) * limit,
			order: [['createdAt', 'DESC']],
			include: [
				{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] },
				{ model: Brand, attributes: ['id', 'name'] },
			],
		})

		return {
			statusCode: 200,
			payload: { plans, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
			message: 'Content plans fetched successfully',
		}
	}

	async findPlansByDate(date: string): Promise<IServiceResponse> {
		const plans = await ContentPlan.findAll({
			where: { is_active: true, start_date: { [Op.lte]: date }, end_date: { [Op.gte]: date } },
			attributes: ['id', 'name', 'start_date', 'end_date', 'status', 'language', 'post_types'],
			order: [['start_date', 'ASC']],
		})
		return {
			statusCode: 200,
			payload: { plans, has_plans: plans.length > 0 },
			message: plans.length ? 'Available plans fetched' : 'No plans cover this date',
		}
	}

	async quickCreatePlan(data: { name: string; start_date: string; end_date: string; brand_id?: string }, userId: string): Promise<IServiceResponse> {
		const plan = await ContentPlan.create({
			name: data.name,
			start_date: new Date(data.start_date),
			end_date: new Date(data.end_date),
			brand_id: data.brand_id || undefined,
			status: 'ACTIVE',
			created_by: userId,
		} as any)
		return { statusCode: 201, payload: plan, message: 'Plan created successfully' }
	}

	async getPlan(id: string): Promise<IServiceResponse> {
		const plan = await this.findPlanById(id)
		return { statusCode: 200, payload: plan, message: 'Content plan fetched successfully' }
	}

	async updatePlan(id: string, data: { name?: string; status?: ContentPlanStatus; language?: string; post_types?: string[] }): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(id)
		if (!plan) throw new NotFoundError('Content plan not found')
		await plan.update(data as any)
		return { statusCode: 200, payload: plan, message: 'Content plan updated successfully' }
	}

	async deletePlan(id: string): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(id)
		if (!plan) throw new NotFoundError('Content plan not found')
		await CalendarEntry.destroy({ where: { content_plan_id: id } })
		await plan.destroy()
		return { statusCode: 200, payload: null, message: 'Content plan deleted successfully' }
	}

	// --- Plan Approval (approves the strategy, not the posts) ---

	async submitPlanForReview(id: string): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(id)
		if (!plan) throw new NotFoundError('Content plan not found')
		if (plan.status !== 'DRAFT') throw new BadRequestError('Only DRAFT plans can be submitted for review')
		await plan.update({ status: 'PENDING_REVIEW' })
		return { statusCode: 200, payload: plan, message: 'Plan submitted for review' }
	}

	async approvePlan(id: string, userId: string): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(id)
		if (!plan) throw new NotFoundError('Content plan not found')
		if (plan.status !== 'PENDING_REVIEW') throw new BadRequestError('Only PENDING_REVIEW plans can be approved')
		await plan.update({ status: 'APPROVED', approved_by: userId, approved_at: new Date() })
		return { statusCode: 200, payload: plan, message: 'Plan approved — now review and approve individual entries for composing' }
	}

	async rejectPlan(id: string): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(id)
		if (!plan) throw new NotFoundError('Content plan not found')
		if (plan.status !== 'PENDING_REVIEW') throw new BadRequestError('Only PENDING_REVIEW plans can be rejected')
		await plan.update({ status: 'DRAFT' })
		return { statusCode: 200, payload: plan, message: 'Plan rejected, moved back to DRAFT' }
	}

	// --- Review Queue ---

	async getReviewQueue(query: { page: number; limit: number; platform?: string; content_plan_id?: string }): Promise<IServiceResponse> {
		const { page, limit, platform, content_plan_id } = query
		const offset = (page - 1) * limit

		const entryWhere: any = { is_active: true, status: 'IN_REVIEW' }
		if (platform) entryWhere.platform = platform
		if (content_plan_id) entryWhere.content_plan_id = content_plan_id

		const { rows: entries, count: total } = await CalendarEntry.findAndCountAll({
			where: entryWhere,
			limit,
			offset,
			order: [['updatedAt', 'DESC']],
			include: [
				{
					model: Post,
					where: { status: 'PENDING_REVIEW', is_active: true },
					include: [{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] }],
				},
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'] },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal'] },
				{ model: ContentPlan, attributes: ['id', 'name', 'status', 'generation_config'] },
			],
		})

		// Backfill products for entries missing product_id using their plan's generation_config
		const planIds = [...new Set(entries.filter((e) => !e.product_id).map((e) => e.content_plan_id))]
		const planProductMap = new Map<string, Product[]>()
		for (const planId of planIds) {
			const plan = entries.find((e) => e.content_plan_id === planId)?.content_plan
			const genConfig = plan?.generation_config as { product_ids?: string[] } | null
			if (genConfig?.product_ids?.length) {
				const products = await Product.findAll({
					where: { id: { [Op.in]: genConfig.product_ids }, is_active: true },
					attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'],
				})
				if (products.length) planProductMap.set(planId, products)
			}
		}

		const planProductIndex = new Map<string, number>()
		const enriched = entries.map((e) => {
			const json = e.toJSON() as any
			if (!json.product && planProductMap.has(e.content_plan_id)) {
				const products = planProductMap.get(e.content_plan_id)!
				const idx = planProductIndex.get(e.content_plan_id) || 0
				json.product = products[idx % products.length].toJSON()
				planProductIndex.set(e.content_plan_id, idx + 1)
			}
			json.media_urls = json.post?.media_urls?.length ? json.post.media_urls : json.product?.image_urls || []
			return json
		})

		return {
			statusCode: 200,
			payload: {
				entries: enriched,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Review queue fetched successfully',
		}
	}

	// --- Scheduling Suggestions ---

	async getSuggestedTimes(query: { date: string; platform: string }): Promise<IServiceResponse> {
		const { date, platform } = query

		// Best posting times for UAE audience (GST = UTC+4)
		const UAE_BEST_TIMES: Record<string, { time: string; label: string; score: number }[]> = {
			instagram: [
				{ time: '09:00', label: 'Morning commute', score: 85 },
				{ time: '12:30', label: 'Lunch break', score: 90 },
				{ time: '17:00', label: 'After work', score: 80 },
				{ time: '20:00', label: 'Evening prime time', score: 95 },
				{ time: '21:30', label: 'Late evening scroll', score: 88 },
			],
			facebook: [
				{ time: '08:00', label: 'Early morning', score: 75 },
				{ time: '13:00', label: 'Lunch break', score: 88 },
				{ time: '16:00', label: 'Afternoon break', score: 82 },
				{ time: '19:00', label: 'Evening', score: 92 },
				{ time: '21:00', label: 'Night browsing', score: 90 },
			],
			x: [
				{ time: '08:30', label: 'Morning news check', score: 80 },
				{ time: '12:00', label: 'Midday', score: 85 },
				{ time: '17:30', label: 'Post-work', score: 88 },
				{ time: '21:00', label: 'Evening', score: 82 },
			],
			linkedin: [
				{ time: '08:00', label: 'Pre-work', score: 90 },
				{ time: '10:00', label: 'Mid-morning', score: 85 },
				{ time: '12:00', label: 'Lunch break', score: 88 },
				{ time: '17:00', label: 'End of work', score: 78 },
			],
			tiktok: [
				{ time: '12:00', label: 'Lunch scroll', score: 82 },
				{ time: '16:00', label: 'After school/work', score: 85 },
				{ time: '19:00', label: 'Evening', score: 90 },
				{ time: '21:00', label: 'Prime time', score: 95 },
				{ time: '23:00', label: 'Late night', score: 80 },
			],
			pinterest: [
				{ time: '09:00', label: 'Morning inspiration', score: 85 },
				{ time: '14:00', label: 'Afternoon browse', score: 88 },
				{ time: '20:00', label: 'Evening planning', score: 92 },
				{ time: '22:00', label: 'Night scroll', score: 80 },
			],
			snapchat: [
				{ time: '10:00', label: 'Late morning', score: 80 },
				{ time: '13:00', label: 'Lunchtime', score: 85 },
				{ time: '18:00', label: 'After work', score: 88 },
				{ time: '21:00', label: 'Evening prime', score: 92 },
			],
		}

		const platformKey = platform.toLowerCase()
		const slots = UAE_BEST_TIMES[platformKey] || UAE_BEST_TIMES.instagram

		const dayOfWeek = new Date(date).getDay()
		const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 // Friday-Saturday in UAE

		const suggestions = slots.map((slot) => {
			const scheduled_at = `${date}T${slot.time}:00+04:00` // GST timezone
			const adjustedScore = isWeekend ? Math.min(100, slot.score + 5) : slot.score
			return {
				scheduled_at,
				time_local: slot.time,
				timezone: 'GST (UTC+4)',
				label: slot.label,
				score: adjustedScore,
				is_weekend: isWeekend,
			}
		}).sort((a, b) => b.score - a.score)

		return {
			statusCode: 200,
			payload: { date, platform, region: 'UAE', suggestions },
			message: 'Suggested posting times for UAE audience',
		}
	}

	// --- Post Composer Flow ---

	async composeEntry(entryId: string, userId: string, data?: { base_content?: string; hashtags?: string[]; cta_text?: string; media_urls?: string[] }): Promise<IServiceResponse> {
		const entry = await CalendarEntry.findByPk(entryId, {
			include: [
				{ model: Product },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal'] },
				{ model: ContentPlan, attributes: ['id', 'status', 'generation_config'] },
			],
		})
		if (!entry) throw new NotFoundError('Calendar entry not found')

		const planStatus = entry.content_plan?.status
		if (!['SUGGESTED', 'APPROVED', 'COMPOSING'].includes(entry.status)) {
			throw new BadRequestError(`Entry is "${entry.status}" — only SUGGESTED, APPROVED, or COMPOSING entries can be composed`)
		}
		if (entry.status === 'SUGGESTED' && planStatus !== 'APPROVED' && planStatus !== 'ACTIVE') {
			throw new BadRequestError('The parent plan must be approved before composing entries')
		}

		// If entry has no product but plan has product_ids, assign the first available product
		const genConfig = entry.content_plan?.generation_config as { product_ids?: string[] } | null
		if (!entry.product_id && genConfig?.product_ids?.length) {
			const productIds = genConfig.product_ids
			const product = await Product.findOne({ where: { id: { [Op.in]: productIds }, is_active: true } })
			if (product) {
				await entry.update({ product_id: product.id })
				entry.product_id = product.id
				entry.product = product
			}
		}

		// If product was backfilled but not fully loaded (missing image_urls), reload it
		if (entry.product_id && (!entry.product || !entry.product.image_urls)) {
			entry.product = await Product.findByPk(entry.product_id) as Product
		}

		let mediaUrls: string[] = data?.media_urls || []
		let aiCaption = data?.base_content || undefined
		let aiHashtags = data?.hashtags || []
		let aiCta = data?.cta_text || undefined

		// If product exists → process images with overlays + AI content
		if (entry.product_id && entry.product?.image_urls?.length && !mediaUrls.length) {
			const result = await contentService.processProductMedia({
				product: entry.product,
				platform: entry.platform,
				slide_count: entry.post_type === 'image' ? 1 : undefined,
			})

			mediaUrls = result.media_urls
			if (!aiCaption) aiCaption = result.ai_content.caption
			if (!aiHashtags.length) aiHashtags = result.ai_content.hashtags
			if (!aiCta) aiCta = result.ai_content.cta
		}

		// Check for existing post — update it with media if it was created empty
		const existingPost = await Post.findOne({
			where: { calendar_entry_id: entryId, is_active: true },
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal', 'type'] },
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})

		if (existingPost) {
			const updates: any = {}
			if (!existingPost.media_urls?.length && mediaUrls.length) updates.media_urls = mediaUrls
			if (!existingPost.base_content && aiCaption) updates.base_content = aiCaption
			if (!existingPost.hashtags?.length && aiHashtags.length) updates.hashtags = aiHashtags
			if (!existingPost.cta_text && aiCta) updates.cta_text = aiCta

			if (Object.keys(updates).length) {
				await existingPost.update(updates)
			}

			return {
				statusCode: 200,
				payload: { post: existingPost, entry },
				message: Object.keys(updates).length ? 'Existing draft updated with processed media and AI content' : 'Existing draft returned',
			}
		}

		const post = await Post.create({
			calendar_entry_id: entryId,
			campaign_id: entry.campaign_id || null,
			author_id: userId,
			base_content: aiCaption || null,
			hashtags: aiHashtags,
			cta_text: aiCta || null,
			platforms: [entry.platform],
			media_urls: mediaUrls,
			status: 'DRAFT',
		} as any)

		await entry.update({ status: 'COMPOSING' })

		const full = await Post.findByPk(post.id, {
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal', 'type'] },
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})

		return {
			statusCode: 201,
			payload: { post: full, entry },
			message: 'Post composed with processed images and AI content',
		}
	}

	async generatePostContent(entryId: string): Promise<IServiceResponse> {
		const entry = await CalendarEntry.findByPk(entryId, {
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'category', 'description', 'short_description', 'highlights'] },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal'] },
				{ model: ContentPlan, attributes: ['id', 'name', 'language', 'generation_config'] },
			],
		})
		if (!entry) throw new NotFoundError('Calendar entry not found')

		// Backfill product from plan config if missing
		if (!entry.product_id) {
			const genConfig = entry.content_plan?.generation_config as { product_ids?: string[] } | null
			if (genConfig?.product_ids?.length) {
				const product = await Product.findOne({ where: { id: { [Op.in]: genConfig.product_ids }, is_active: true } })
				if (product) {
					await entry.update({ product_id: product.id })
					entry.product_id = product.id
					entry.product = product
				}
			}
		}
		if (!['SUGGESTED', 'APPROVED', 'COMPOSING'].includes(entry.status)) {
			throw new BadRequestError('Entry must be SUGGESTED, APPROVED, or COMPOSING to generate content')
		}

		const content = await this.callAIForPostContent(entry)

		return {
			statusCode: 200,
			payload: content,
			message: 'AI-generated post content ready — use this to compose or update your post',
		}
	}

	async previewPost(postId: string): Promise<IServiceResponse> {
		const post = await Post.findByPk(postId, {
			include: [
				{ model: Campaign, attributes: ['id', 'name', 'goal', 'type'] },
				{ model: User, as: 'author', attributes: ['id', 'email', 'first_name'] },
			],
		})
		if (!post) throw new NotFoundError('Post not found')

		const entry = post.calendar_entry_id
			? await CalendarEntry.findByPk(post.calendar_entry_id, {
				include: [
					{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'] },
					{ model: ContentPlan, attributes: ['id', 'name'] },
				],
			})
			: null

		return {
			statusCode: 200,
			payload: {
				post: {
					id: post.id,
					status: post.status,
					base_content: post.base_content,
					hashtags: post.hashtags,
					cta_text: post.cta_text,
					platforms: post.platforms,
					media_urls: post.media_urls,
					scheduled_at: post.scheduled_at,
					author: (post as any).author,
					campaign: (post as any).campaign,
				},
				entry: entry ? {
					id: entry.id,
					date: entry.date,
					title: entry.title,
					description: entry.description,
					content_type: entry.content_type,
					post_type: entry.post_type,
					platform: entry.platform,
					product: (entry as any).product,
					content_plan: (entry as any).content_plan,
				} : null,
			},
			message: 'Post preview',
		}
	}

	// --- Calendar Entries ---

	async getCalendar(query: CalendarQuery): Promise<IServiceResponse> {
		const where: any = {
			is_active: true,
			date: { [Op.between]: [query.start_date, query.end_date] },
		}
		if (query.platform) where.platform = query.platform
		if (query.content_type) where.content_type = query.content_type
		if (query.status) {
			where.status = Array.isArray(query.status) ? { [Op.in]: query.status } : query.status
		}
		if (query.content_plan_id) where.content_plan_id = query.content_plan_id

		const entries = await CalendarEntry.findAll({
			where,
			order: [['date', 'ASC'], ['platform', 'ASC']],
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'] },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal', 'status'] },
				{ model: Post, attributes: ['id', 'status', 'media_urls', 'base_content', 'hashtags', 'published_at'] },
				{ model: ContentPlan, attributes: ['id', 'name', 'status', 'generation_config'] },
			],
		})

		// Backfill products for entries missing product_id using their plan's generation_config
		const planIds = [...new Set(entries.filter((e) => !e.product_id).map((e) => e.content_plan_id))]
		const planProductMap = new Map<string, Product[]>()
		for (const planId of planIds) {
			const plan = entries.find((e) => e.content_plan_id === planId)?.content_plan
			const genConfig = plan?.generation_config as { product_ids?: string[] } | null
			if (genConfig?.product_ids?.length) {
				const products = await Product.findAll({
					where: { id: { [Op.in]: genConfig.product_ids }, is_active: true },
					attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'],
				})
				if (products.length) planProductMap.set(planId, products)
			}
		}

		const planProductIndex = new Map<string, number>()
		const enriched = entries.map((e) => {
			const json = e.toJSON() as any
			if (!json.product && planProductMap.has(e.content_plan_id)) {
				const products = planProductMap.get(e.content_plan_id)!
				const idx = planProductIndex.get(e.content_plan_id) || 0
				json.product = products[idx % products.length].toJSON()
				planProductIndex.set(e.content_plan_id, idx + 1)
			}
			json.media_urls = json.post?.media_urls?.length ? json.post.media_urls : json.product?.image_urls || []
			return json
		})

		return { statusCode: 200, payload: { entries: enriched, calendar: this.groupByDate(entries) }, message: 'Calendar fetched successfully' }
	}

	async createEntry(data: any): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(data.content_plan_id)
		if (!plan) throw new NotFoundError('Content plan not found')

		const entryDate = new Date(data.date)
		const planStart = new Date(String(plan.start_date))
		const planEnd = new Date(String(plan.end_date))
		if (entryDate < planStart || entryDate > planEnd) {
			throw new BadRequestError(`Entry date must be within plan range (${plan.start_date} to ${plan.end_date})`)
		}

		const entry = await CalendarEntry.create({ ...data, status: 'APPROVED' } as any)
		const full = await CalendarEntry.findByPk(entry.id, {
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label'] },
				{ model: Campaign, attributes: ['id', 'name'] },
			],
		})
		return { statusCode: 201, payload: full, message: 'Calendar entry created successfully' }
	}

	async updateEntry(id: string, data: any): Promise<IServiceResponse> {
		const entry = await CalendarEntry.findByPk(id, {
			include: [{ model: ContentPlan, attributes: ['id', 'status'] }],
		})
		if (!entry) throw new NotFoundError('Calendar entry not found')

		if (data.status) {
			const VALID_TRANSITIONS: Record<string, string[]> = {
				SUGGESTED: ['APPROVED', 'SKIPPED'],
				APPROVED: ['SUGGESTED', 'SKIPPED'],
				COMPOSING: ['IN_REVIEW', 'SKIPPED'],
				IN_REVIEW: ['COMPOSING', 'READY', 'SKIPPED'],
				READY: ['SCHEDULED', 'SKIPPED'],
				SKIPPED: ['SUGGESTED'],
			}

			const allowed = VALID_TRANSITIONS[entry.status]
			if (!allowed || !allowed.includes(data.status)) {
				throw new BadRequestError(`Cannot change entry from ${entry.status} to ${data.status}`)
			}

		}

		await entry.update(data)
		return { statusCode: 200, payload: entry, message: 'Calendar entry updated successfully' }
	}

	async deleteEntry(id: string): Promise<IServiceResponse> {
		const entry = await CalendarEntry.findByPk(id)
		if (!entry) throw new NotFoundError('Calendar entry not found')
		await entry.destroy()
		return { statusCode: 200, payload: null, message: 'Calendar entry deleted successfully' }
	}

	// --- Private helpers ---

	private async findPlanById(id: string) {
		const plan = await ContentPlan.findByPk(id, {
			include: [
				{ model: User, as: 'creator', attributes: ['id', 'email', 'first_name'] },
				{ model: Brand, attributes: ['id', 'name'] },
			],
		})
		if (!plan) throw new NotFoundError('Content plan not found')

		const entries = await CalendarEntry.findAll({
			where: { content_plan_id: id, is_active: true },
			order: [['date', 'ASC'], ['platform', 'ASC']],
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'] },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal'] },
				{ model: Post, attributes: ['id', 'status', 'media_urls', 'base_content', 'hashtags'] },
			],
		})

		// Backfill product for entries that have no product_id but plan has product_ids configured
		const genConfig = plan.generation_config as { product_ids?: string[] } | null
		let fallbackProducts: Product[] | null = null
		if (genConfig?.product_ids?.length) {
			fallbackProducts = await Product.findAll({
				where: { id: { [Op.in]: genConfig.product_ids }, is_active: true },
				attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'],
			})
		}

		let productIndex = 0
		const enriched = entries.map((e) => {
			const json = e.toJSON() as any
			if (!json.product && fallbackProducts?.length) {
				json.product = fallbackProducts[productIndex % fallbackProducts.length].toJSON()
				productIndex++
			}
			json.media_urls = json.post?.media_urls?.length ? json.post.media_urls : json.product?.image_urls || []
			return json
		})

		return { ...plan.toJSON(), entries: enriched, calendar: this.groupByDate(enriched) }
	}

	private groupByDate(entries: CalendarEntry[]) {
		const grouped: Record<string, any[]> = {}
		for (const entry of entries) {
			const dateKey = String(entry.date)
			if (!grouped[dateKey]) grouped[dateKey] = []
			grouped[dateKey].push(entry)
		}
		return grouped
	}

	private async fetchProducts(productIds?: string[]): Promise<Product[]> {
		const where: any = { is_active: true }
		if (productIds?.length) where.id = { [Op.in]: productIds }
		return Product.findAll({
			where,
			attributes: ['id', 'name', 'description', 'short_description', 'price', 'compare_at_price', 'currency', 'offer_label', 'category', 'city', 'image_urls', 'highlights'],
			order: [['createdAt', 'DESC']],
			limit: productIds?.length ? undefined : 50,
		})
	}

	private async fetchActiveCampaigns(startDate: string, endDate: string): Promise<Campaign[]> {
		return Campaign.findAll({
			where: {
				is_active: true,
				status: 'ACTIVE',
				start_date: { [Op.lte]: endDate },
				end_date: { [Op.gte]: startDate },
			},
			include: [{ model: Product, attributes: ['id', 'name', 'offer_label'] }],
		})
	}

	private sanitizeProductId(productId: any): string | undefined {
		if (!productId || productId === 'null' || productId === 'undefined' || productId === '') return undefined
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		return uuidRegex.test(productId) ? productId : undefined
	}

	private sanitizeAIEntries(entries: AIPlanEntry[], products?: Product[]): AIPlanEntry[] {
		let productIndex = 0
		return entries.map((e) => {
			let productId = this.sanitizeProductId(e.product_id) || undefined

			// If PRODUCT_PROMO but AI didn't assign a valid product_id, assign one from the available products (round-robin)
			if (!productId && e.content_type === 'PRODUCT_PROMO' && products?.length) {
				productId = products[productIndex % products.length].id
				productIndex++
			}

			return { ...e, product_id: productId }
		})
	}

	private matchCampaign(entry: AIPlanEntry, campaigns: Campaign[]): string | undefined {
		if (!entry.product_id) return undefined
		return campaigns.find((c) => c.product_id === entry.product_id)?.id
	}

	private splitDateRange(start: string, end: string, batchDays: number): Array<{ start: string; end: string }> {
		const batches: Array<{ start: string; end: string }> = []
		let current = new Date(start)
		const endDate = new Date(end)

		while (current <= endDate) {
			const batchEnd = new Date(current)
			batchEnd.setDate(batchEnd.getDate() + batchDays - 1)
			if (batchEnd > endDate) batchEnd.setTime(endDate.getTime())

			batches.push({
				start: current.toISOString().split('T')[0],
				end: batchEnd.toISOString().split('T')[0],
			})

			current = new Date(batchEnd)
			current.setDate(current.getDate() + 1)
		}

		return batches
	}

	private async callAIForPlan(input: GeneratePlanInput, products: Product[], campaigns: Campaign[]): Promise<AIPlanEntry[]> {
		const productSummaries = products.map((p) => ({
			id: p.id,
			name: p.name,
			short_description: p.short_description || p.description?.slice(0, 150),
			price: p.price,
			compare_at_price: p.compare_at_price,
			offer_label: p.offer_label,
			category: p.category,
			city: p.city,
		}))

		const campaignSummaries = campaigns.map((c) => ({
			id: c.id,
			name: c.name,
			goal: c.goal,
			product_id: c.product_id,
			start_date: c.start_date,
			end_date: c.end_date,
		}))

		const totalDays = Math.ceil((new Date(input.end_date).getTime() - new Date(input.start_date).getTime()) / 86400000) + 1
		const totalEntries = totalDays * input.platforms.length * input.posts_per_day
		const isAllPostTypes = input.post_types.length === VALID_POST_TYPES.length

		const postTypeRule = isAllPostTypes
			? `- DAILY POST FORMAT ROTATION: Rotate post formats by day so each day has ONE dominant format across all platforms. Example: Day 1 = image, Day 2 = reel, Day 3 = carousel, Day 4 = story, Day 5 = cinematic_video, Day 6 = text, then repeat. All entries on the same day MUST use the same post_type. Available formats: ${VALID_POST_TYPES.join(', ')}.`
			: `- Allowed post formats: ${input.post_types.join(', ')}. ONLY use these formats. All entries on a given day should use the same post_type from this list, rotating daily.`

		const systemPrompt = `You are a social media content strategist for Rayna Tours, Dubai's top tours & activities company.

RESPOND WITH VALID JSON ONLY — no markdown, no explanation:
{"entries":[{"date":"YYYY-MM-DD","title":"under 60 chars","description":"creative brief for designer/copywriter","content_type":"PRODUCT_PROMO|FESTIVAL_GREETING|ENGAGEMENT|VALUE|BRAND_AWARENESS","post_type":"${input.post_types.join('|')}","platform":"platform_name","product_id":"uuid or null","ai_rationale":"why this content today"}]}

RULES:
- Generate EXACTLY ${totalEntries} entries (${totalDays} days × ${input.platforms.length} platform(s) × ${input.posts_per_day}/day)
- Every date from ${input.start_date} to ${input.end_date} MUST have entries
- product_id must be an exact UUID from the product list or null
- For PRODUCT_PROMO: always set a real product_id
- Spread products evenly, no same product on consecutive days per platform
- ${input.primary_goal === 'bookings' ? 'Mix: 45% PRODUCT_PROMO, 20% ENGAGEMENT, 15% VALUE, 10% FESTIVAL_GREETING, 10% BRAND_AWARENESS' : ''}${input.primary_goal === 'engagement' ? 'Mix: 25% PRODUCT_PROMO, 35% ENGAGEMENT, 20% VALUE, 10% FESTIVAL_GREETING, 10% BRAND_AWARENESS' : ''}${input.primary_goal === 'brand_awareness' ? 'Mix: 20% PRODUCT_PROMO, 15% ENGAGEMENT, 20% VALUE, 15% FESTIVAL_GREETING, 30% BRAND_AWARENESS' : ''}${input.primary_goal === 'followers' ? 'Mix: 30% PRODUCT_PROMO, 30% ENGAGEMENT, 20% VALUE, 10% FESTIVAL_GREETING, 10% BRAND_AWARENESS' : ''}
- UAE weekend = Fri-Sat → engagement/leisure content. Sun = work week start.
- ${input.include_festivals ? 'Include FESTIVAL_GREETING for real holidays in this period (Ramadan, Eid, UAE National Day, etc.)' : 'Skip FESTIVAL_GREETING entries'}
- ${input.include_engagement ? 'Include ENGAGEMENT and VALUE posts' : 'Only PRODUCT_PROMO and BRAND_AWARENESS'}
- Tone: ${input.tone}. Target: ${input.target_audience}. Region: ${input.region}.
- Language: ALL captions, titles, and descriptions MUST be written in ${input.language}.
${postTypeRule}
- Description = visual direction + copy angle + CTA + must match the post_type for that day
- Platform rules: Instagram=visual+reels, TikTok=trends+hooks, Facebook=community+links, X=concise+witty, YouTube=SEO titles, LinkedIn=professional`

		const userPrompt = `Date range: ${input.start_date} to ${input.end_date} (${totalDays} days)
Platforms: ${input.platforms.join(', ')} | Posts/day: ${input.posts_per_day} | Goal: ${input.primary_goal} | Language: ${input.language} | Format strategy: ${isAllPostTypes ? 'Rotate one format per day (image → reel → carousel → story → cinematic_video → text)' : input.post_types.join(', ')}
${input.special_notes ? `Notes: ${input.special_notes}` : ''}

Products: ${JSON.stringify(productSummaries)}

${campaignSummaries.length ? `Active campaigns: ${JSON.stringify(campaignSummaries)}` : 'No active campaigns.'}

Generate ${totalEntries} entries now.`

		const result = await aiService.callOpenAIRaw<{ entries: AIPlanEntry[] }>(systemPrompt, userPrompt)
		return this.sanitizeAIEntries(result.entries || [], products)
	}

	private async callAIForPostContent(entry: CalendarEntry): Promise<AIPostContent> {
		const product = (entry as any).product
		const campaign = (entry as any).campaign
		const plan = (entry as any).content_plan
		const language = plan?.language || entry.language || 'english'

		const productContext = product
			? `Product: ${product.name} — ${product.short_description || product.description || 'N/A'}. Price: ${product.price}. Offer: ${product.offer_label || 'none'}. Category: ${product.category || 'N/A'}. Highlights: ${product.highlights?.join(', ') || 'N/A'}.`
			: 'No specific product.'

		const campaignContext = campaign ? `Campaign: ${campaign.name} — Goal: ${campaign.goal}.` : ''

		const systemPrompt = `You are a social media copywriter for Rayna Tours, Dubai's top tours & activities company.

RESPOND WITH VALID JSON ONLY — no markdown, no explanation:
{"caption":"the full post caption ready to publish","hashtags":["hashtag1","hashtag2",...],"cta_text":"call to action text"}

RULES:
- Write the caption in ${language}
- Platform: ${entry.platform} — adapt tone and length accordingly
- Post type: ${entry.post_type} — match the caption style to format
- Content type: ${entry.content_type}
- For PRODUCT_PROMO: highlight the product, include price if relevant, create urgency
- For ENGAGEMENT: ask questions, create polls, encourage comments
- For VALUE: share tips, facts, or useful info about Dubai/travel
- For FESTIVAL_GREETING: be warm, cultural, respectful
- For BRAND_AWARENESS: tell the brand story, build trust
- Hashtags: 10-15 relevant hashtags (mix of branded, niche, and trending)
- CTA: platform-appropriate call to action (link in bio, book now, comment below, etc.)
- Keep captions engaging, scroll-stopping, with emojis where appropriate`

		const userPrompt = `Create post content for:
Title: ${entry.title}
Brief: ${entry.description || 'No specific brief'}
${productContext}
${campaignContext}
Platform: ${entry.platform} | Format: ${entry.post_type} | Type: ${entry.content_type} | Language: ${language}`

		return aiService.callOpenAIRaw<AIPostContent>(systemPrompt, userPrompt)
	}
}

export const contentStudioService = new ContentStudioService()
