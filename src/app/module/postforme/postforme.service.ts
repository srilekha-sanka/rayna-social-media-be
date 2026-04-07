import { env } from '../../../db/config/env.config'
import { logger } from '../../common/logger/logging'

// ── Response Types ───────────────────────────────────────────────────

interface PFMSocialAccount {
	id: string
	platform: string
	username: string
	external_id: string | null
	status: string
	created_at: string
	updated_at: string
}

interface PFMAuthUrlResponse {
	url: string
	platform: string
}

interface PFMSocialPost {
	id: string
	caption: string
	status: string // draft | scheduled | processing | processed
	scheduled_at: string | null
	created_at: string
	updated_at: string
}

interface PFMPostResult {
	id: string
	social_account_id: string
	post_id: string
	success: boolean
	error: string | null
	platform_data: { id: string; url: string } | null
	details: object | null
}

interface PFMMediaUpload {
	upload_url: string
	media_url: string
}

interface PFMPaginatedResponse<T> {
	data: T[]
	meta: {
		total: number
		offset: number
		limit: number
		next: string | null
	}
}

// ── Request Types ────────────────────────────────────────────────────

interface PFMCreatePostPayload {
	caption: string
	social_accounts: string[]
	scheduled_at?: string | null
	media?: Array<{ url: string; thumbnail_url?: string }>
	platform_configurations?: Record<string, object>
	external_id?: string
	isDraft?: boolean
}

// ── Service ──────────────────────────────────────────────────────────

class PostForMeService {
	private baseUrl: string
	private apiKey: string

	constructor() {
		this.baseUrl = env.postforme.baseUrl
		this.apiKey = env.postforme.apiKey
	}

	private async request<T>(method: string, path: string, body?: any): Promise<T> {
		const url = `${this.baseUrl}${path}`

		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.apiKey}`,
			'Content-Type': 'application/json',
		}

		const options: RequestInit = { method, headers }
		if (body) {
			options.body = JSON.stringify(body)
		}

		const response = await fetch(url, options)

		if (!response.ok) {
			const errorBody = await response.text()
			logger.error(`PostForMe API error: ${response.status} ${errorBody}`)
			throw new Error(`PostForMe API error: ${response.status} - ${errorBody}`)
		}

		const text = await response.text()
		return text ? (JSON.parse(text) as T) : ({} as T)
	}

	// ── Social Account OAuth ─────────────────────────────────────────

	async getAuthUrl(platform: string): Promise<PFMAuthUrlResponse> {
		return this.request<PFMAuthUrlResponse>('POST', '/v1/social-accounts/auth-url', {
			platform,
			permissions: ['posts', 'feeds'],
		})
	}

	// ── Social Accounts ──────────────────────────────────────────────

	async listAccounts(filters?: {
		platform?: string
		status?: string
		offset?: number
		limit?: number
	}): Promise<PFMPaginatedResponse<PFMSocialAccount>> {
		const params = new URLSearchParams()
		if (filters?.platform) params.set('platform', filters.platform)
		if (filters?.status) params.set('status', filters.status)
		if (filters?.offset) params.set('offset', String(filters.offset))
		if (filters?.limit) params.set('limit', String(filters.limit))

		const qs = params.toString()
		return this.request<PFMPaginatedResponse<PFMSocialAccount>>('GET', `/v1/social-accounts${qs ? `?${qs}` : ''}`)
	}

	async getAccount(accountId: string): Promise<PFMSocialAccount> {
		return this.request<PFMSocialAccount>('GET', `/v1/social-accounts/${accountId}`)
	}

	async disconnectAccount(accountId: string): Promise<{ status: string }> {
		return this.request<{ status: string }>('POST', `/v1/social-accounts/${accountId}/disconnect`)
	}

	// ── Publishing ───────────────────────────────────────────────────

	async createPost(payload: PFMCreatePostPayload): Promise<PFMSocialPost> {
		return this.request<PFMSocialPost>('POST', '/v1/social-posts', payload)
	}

	async getPost(postId: string): Promise<PFMSocialPost> {
		return this.request<PFMSocialPost>('GET', `/v1/social-posts/${postId}`)
	}

	async deletePost(postId: string): Promise<{ success: boolean }> {
		return this.request<{ success: boolean }>('DELETE', `/v1/social-posts/${postId}`)
	}

	// ── Post Results / Analytics ─────────────────────────────────────

	async getPostResults(postId: string): Promise<PFMPaginatedResponse<PFMPostResult>> {
		return this.request<PFMPaginatedResponse<PFMPostResult>>('GET', `/v1/social-post-results?post_id=${postId}`)
	}

	// ── Media Upload ─────────────────────────────────────────────────

	async getUploadUrl(): Promise<PFMMediaUpload> {
		return this.request<PFMMediaUpload>('POST', '/v1/media/create-upload-url')
	}

	// ── Account Feeds ────────────────────────────────────────────────

	async getAccountFeed(
		socialAccountId: string,
		options?: { limit?: number; cursor?: string; expand?: string[] }
	): Promise<any> {
		const params = new URLSearchParams()
		if (options?.limit) params.set('limit', String(options.limit))
		if (options?.cursor) params.set('cursor', options.cursor)
		if (options?.expand) params.set('expand', options.expand.join(','))

		const qs = params.toString()
		return this.request('GET', `/v1/social-account-feeds/${socialAccountId}${qs ? `?${qs}` : ''}`)
	}

	// ── Webhooks ─────────────────────────────────────────────────────

	verifyWebhook(secret: string, expectedSecret: string): boolean {
		return secret === expectedSecret
	}
}

export const postForMeService = new PostForMeService()
