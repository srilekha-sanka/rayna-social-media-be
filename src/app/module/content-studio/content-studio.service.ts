import { Op, WhereOptions } from 'sequelize'
import ContentPlan, { ContentPlanStatus } from './content-plan.model'
import CalendarEntry, { EntryContentType } from './calendar-entry.model'
import Product from '../product/product.model'
import Campaign from '../campaign/campaign.model'
import Post from '../post/post.model'
import User from '../user/user.model'
import Brand from '../brand/brand.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { aiService } from '../ai/ai.service'

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
	special_notes?: string
}

type GenerateEntriesInput = Omit<GeneratePlanInput, 'name' | 'start_date' | 'end_date' | 'brand_id'> & { skip_existing_dates: boolean }

interface AIPlanEntry {
	date: string
	title: string
	description: string
	content_type: EntryContentType
	platform: string
	product_id?: string
	ai_rationale: string
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
			created_by: userId,
			generation_config: {
				platforms: input.platforms,
				product_ids: input.product_ids,
				include_festivals: input.include_festivals,
				include_engagement: input.include_engagement,
				posts_per_day: input.posts_per_day,
				tone: input.tone,
				primary_goal: input.primary_goal,
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
		const productImageMap = this.buildProductImageMap(products)
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
				platform: entry.platform,
				product_id: entry.product_id || undefined,
				campaign_id: this.matchCampaign(entry, activeCampaigns),
				ai_rationale: entry.ai_rationale,
				media_urls: entry.product_id ? (productImageMap.get(entry.product_id) || []).slice(0, 4) : [],
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
		const productImageMap = this.buildProductImageMap(products)
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
						platform: entry.platform,
						product_id: entry.product_id || undefined,
						campaign_id: this.matchCampaign(entry, activeCampaigns),
						ai_rationale: entry.ai_rationale,
						media_urls: entry.product_id ? (productImageMap.get(entry.product_id) || []).slice(0, 4) : [],
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

	// --- CRUD (unchanged) ---

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
			attributes: ['id', 'name', 'start_date', 'end_date', 'status'],
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

	async updatePlan(id: string, data: { name?: string; status?: ContentPlanStatus }): Promise<IServiceResponse> {
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
		await CalendarEntry.update({ status: 'APPROVED' }, { where: { content_plan_id: id, status: 'SUGGESTED' } })
		return { statusCode: 200, payload: plan, message: 'Plan approved successfully' }
	}

	async rejectPlan(id: string): Promise<IServiceResponse> {
		const plan = await ContentPlan.findByPk(id)
		if (!plan) throw new NotFoundError('Content plan not found')
		if (plan.status !== 'PENDING_REVIEW') throw new BadRequestError('Only PENDING_REVIEW plans can be rejected')
		await plan.update({ status: 'DRAFT' })
		return { statusCode: 200, payload: plan, message: 'Plan rejected, moved back to DRAFT' }
	}

	// --- Calendar Entries ---

	async getCalendar(query: CalendarQuery): Promise<IServiceResponse> {
		const where: any = {
			is_active: true,
			date: { [Op.between]: [query.start_date, query.end_date] },
		}
		if (query.platform) where.platform = query.platform
		if (query.content_type) where.content_type = query.content_type
		if (query.status) where.status = query.status
		if (query.content_plan_id) where.content_plan_id = query.content_plan_id

		const entries = await CalendarEntry.findAll({
			where,
			order: [['date', 'ASC'], ['platform', 'ASC']],
			include: [
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls', 'category'] },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal', 'status'] },
				{ model: Post, attributes: ['id', 'status', 'media_urls', 'published_at'] },
				{ model: ContentPlan, attributes: ['id', 'name', 'status'] },
			],
		})

		return { statusCode: 200, payload: { entries, calendar: this.groupByDate(entries) }, message: 'Calendar fetched successfully' }
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

		data.status = 'APPROVED'
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
		const entry = await CalendarEntry.findByPk(id)
		if (!entry) throw new NotFoundError('Calendar entry not found')
		await entry.update(data)
		return { statusCode: 200, payload: entry, message: 'Calendar entry updated successfully' }
	}

	async deleteEntry(id: string): Promise<IServiceResponse> {
		const entry = await CalendarEntry.findByPk(id)
		if (!entry) throw new NotFoundError('Calendar entry not found')
		await entry.destroy()
		return { statusCode: 200, payload: null, message: 'Calendar entry deleted successfully' }
	}

	async bulkUpdateEntries(entryIds: string[], status: string): Promise<IServiceResponse> {
		const [updated] = await CalendarEntry.update({ status } as any, { where: { id: { [Op.in]: entryIds } } })
		return { statusCode: 200, payload: { updated_count: updated }, message: `${updated} entries updated successfully` }
	}

	async linkEntryToPost(entryId: string, postId: string): Promise<IServiceResponse> {
		const entry = await CalendarEntry.findByPk(entryId)
		if (!entry) throw new NotFoundError('Calendar entry not found')
		const post = await Post.findByPk(postId)
		if (!post) throw new NotFoundError('Post not found')
		await entry.update({ post_id: postId })
		return { statusCode: 200, payload: entry, message: 'Entry linked to post successfully' }
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
				{ model: Product, attributes: ['id', 'name', 'price', 'offer_label', 'image_urls'] },
				{ model: Campaign, attributes: ['id', 'name', 'type', 'goal'] },
				{ model: Post, attributes: ['id', 'status', 'media_urls'] },
			],
		})

		return { ...plan.toJSON(), entries, calendar: this.groupByDate(entries) }
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

	private buildProductImageMap(products: Product[]): Map<string, string[]> {
		const map = new Map<string, string[]>()
		for (const p of products) {
			if (p.image_urls?.length) map.set(p.id, p.image_urls)
		}
		return map
	}

	private sanitizeProductId(productId: any): string | undefined {
		if (!productId || productId === 'null' || productId === 'undefined' || productId === '') return undefined
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		return uuidRegex.test(productId) ? productId : undefined
	}

	private sanitizeAIEntries(entries: AIPlanEntry[]): AIPlanEntry[] {
		return entries.map((e) => ({ ...e, product_id: this.sanitizeProductId(e.product_id) || undefined }))
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

		const systemPrompt = `You are a social media content strategist for Rayna Tours, Dubai's top tours & activities company.

RESPOND WITH VALID JSON ONLY — no markdown, no explanation:
{"entries":[{"date":"YYYY-MM-DD","title":"under 60 chars","description":"creative brief for designer/copywriter","content_type":"PRODUCT_PROMO|FESTIVAL_GREETING|ENGAGEMENT|VALUE|BRAND_AWARENESS","platform":"platform_name","product_id":"uuid or null","ai_rationale":"why this content today"}]}

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
- Description = visual direction + copy angle + CTA + format (carousel/reel/story/single)
- Platform rules: Instagram=visual+reels, TikTok=trends+hooks, Facebook=community+links, X=concise+witty, YouTube=SEO titles, LinkedIn=professional`

		const userPrompt = `Date range: ${input.start_date} to ${input.end_date} (${totalDays} days)
Platforms: ${input.platforms.join(', ')} | Posts/day: ${input.posts_per_day} | Goal: ${input.primary_goal}
${input.special_notes ? `Notes: ${input.special_notes}` : ''}

Products: ${JSON.stringify(productSummaries)}

${campaignSummaries.length ? `Active campaigns: ${JSON.stringify(campaignSummaries)}` : 'No active campaigns.'}

Generate ${totalEntries} entries now.`

		const result = await aiService.callOpenAIRaw<{ entries: AIPlanEntry[] }>(systemPrompt, userPrompt)
		return this.sanitizeAIEntries(result.entries || [])
	}
}

export const contentStudioService = new ContentStudioService()
