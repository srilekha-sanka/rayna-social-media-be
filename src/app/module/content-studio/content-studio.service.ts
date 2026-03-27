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
}

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

class ContentStudioService {
	async generatePlan(input: GeneratePlanInput, userId: string): Promise<IServiceResponse> {
		const products = await this.fetchProducts(input.product_ids)
		if (!products.length) {
			throw new BadRequestError('No products found. At least one product is required to generate a plan.')
		}

		const activeCampaigns = await Campaign.findAll({
			where: {
				is_active: true,
				status: 'ACTIVE',
				start_date: { [Op.lte]: input.end_date },
				end_date: { [Op.gte]: input.start_date },
			},
			include: [{ model: Product, attributes: ['id', 'name', 'offer_label'] }],
		})

		const aiEntries = await this.callAIForPlan(input, products, activeCampaigns)

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
			},
		} as any)

		const entries = await CalendarEntry.bulkCreate(
			aiEntries.map((entry) => ({
				content_plan_id: plan.id,
				date: new Date(entry.date),
				title: entry.title,
				description: entry.description,
				content_type: entry.content_type,
				platform: entry.platform,
				product_id: entry.product_id || undefined,
				campaign_id: this.matchCampaign(entry, activeCampaigns),
				ai_rationale: entry.ai_rationale,
			})) as any[]
		)

		const fullPlan = await this.findPlanById(plan.id)

		return { statusCode: 201, payload: fullPlan, message: 'Content plan generated successfully' }
	}

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
			where: {
				is_active: true,
				start_date: { [Op.lte]: date },
				end_date: { [Op.gte]: date },
			},
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

		const calendar = this.groupByDate(entries)

		return { statusCode: 200, payload: { entries, calendar }, message: 'Calendar fetched successfully' }
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

	private matchCampaign(entry: AIPlanEntry, campaigns: Campaign[]): string | undefined {
		if (!entry.product_id) return undefined
		const match = campaigns.find((c) => c.product_id === entry.product_id)
		return match?.id
	}

	private async callAIForPlan(input: GeneratePlanInput, products: Product[], campaigns: Campaign[]): Promise<AIPlanEntry[]> {
		const productSummaries = products.map((p) => ({
			id: p.id,
			name: p.name,
			short_description: p.short_description || p.description?.slice(0, 200),
			price: p.price,
			compare_at_price: p.compare_at_price,
			offer_label: p.offer_label,
			category: p.category,
			city: p.city,
			highlights: p.highlights?.slice(0, 3),
		}))

		const campaignSummaries = campaigns.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
			goal: c.goal,
			product_id: c.product_id,
			start_date: c.start_date,
			end_date: c.end_date,
		}))

		const systemPrompt = `You are the content strategy director at Rayna Tours, Dubai's top tours & activities company. You plan social media content calendars that maximize bookings and engagement.

You MUST respond with valid JSON in this exact structure:
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "title": "Campaign title / theme",
      "description": "What to post and why — brief creative direction",
      "content_type": "PRODUCT_PROMO | FESTIVAL_GREETING | ENGAGEMENT | VALUE | BRAND_AWARENESS",
      "platform": "instagram | facebook | x | tiktok | youtube | linkedin | viber",
      "product_id": "uuid or null",
      "ai_rationale": "Why this content on this day"
    }
  ]
}

Content Planning Rules:
- Create exactly one entry per day per platform requested
- Spread products evenly — don't repeat the same product on consecutive days
- content_type distribution for a balanced feed:
  - 40% PRODUCT_PROMO: tied to a specific product, highlight offers/price/USP
  - 15% FESTIVAL_GREETING: local/international occasions, UAE holidays, seasonal events
  - 20% ENGAGEMENT: polls, questions, user-generated content prompts, "tag a friend"
  - 15% VALUE: travel tips, Dubai guides, hidden gems, "did you know" facts
  - 10% BRAND_AWARENESS: behind the scenes, team stories, company milestones
- For PRODUCT_PROMO: always set product_id to an actual product UUID from the list
- For FESTIVAL_GREETING: check real dates — Ramadan, Eid, UAE National Day, Christmas, New Year, etc.
- For active campaigns with offer dates: schedule promos within the offer window, increase frequency near offer end
- Weekend (Fri-Sat in UAE) = higher engagement content
- Title should be concise (under 60 chars), catchy, and calendar-friendly
- Description should give enough creative direction for a designer/copywriter to execute
- ai_rationale should explain the strategic reasoning (product rotation, offer timing, audience engagement pattern)`

		const userPrompt = `Generate a content calendar from ${input.start_date} to ${input.end_date}.

Platforms: ${input.platforms.join(', ')}
Posts per day: ${input.posts_per_day}
${input.include_festivals ? 'Include festival/greeting posts for relevant dates in this period.' : 'Skip festival posts.'}
${input.include_engagement ? 'Include engagement and value posts.' : 'Focus only on product promotions.'}

Available Products:
${JSON.stringify(productSummaries, null, 2)}

Active Campaigns (align promos with these):
${campaignSummaries.length ? JSON.stringify(campaignSummaries, null, 2) : 'No active campaigns — suggest fresh promotions.'}

Generate the full day-wise content plan. Every date in the range must have at least one entry.`

		const result = await aiService.callOpenAIRaw<{ entries: AIPlanEntry[] }>(systemPrompt, userPrompt)
		return result.entries
	}
}

export const contentStudioService = new ContentStudioService()
