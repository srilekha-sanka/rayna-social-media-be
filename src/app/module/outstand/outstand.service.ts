import { env } from '../../../db/config/env.config'
import { logger } from '../../common/logger/logging'

interface OutstandAuthUrlResponse {
	auth_url: string
}

interface OutstandAccountResponse {
	id: string
	platform: string
	display_name: string
	username: string
	avatar_url: string
	platform_user_id: string
	status: string
}

interface OutstandPostPayload {
	content: string
	platforms: string[]
	media_urls?: string[]
	scheduled_at?: string
}

interface OutstandPostResponse {
	id: string
	status: string
	platform_posts: Array<{
		platform: string
		post_id: string
		url: string
		status: string
	}>
}

interface OutstandPostAnalytics {
	impressions: number
	reach: number
	engagement: number
	clicks: number
	shares: number
	saves: number
	comments: number
	likes: number
	video_views: number
}

class OutstandService {
	private baseUrl: string
	private apiKey: string

	constructor() {
		this.baseUrl = env.outstand.baseUrl
		this.apiKey = env.outstand.apiKey
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
			logger.error(`Outstand API error: ${response.status} ${errorBody}`)
			throw new Error(`Outstand API error: ${response.status} - ${errorBody}`)
		}

		return response.json() as Promise<T>
	}

	// ── Auth ──────────────────────────────────────────────────────────

	async getAuthUrl(platform: string, redirectUrl?: string): Promise<OutstandAuthUrlResponse> {
		return this.request<OutstandAuthUrlResponse>('POST', '/social-networks/auth-url', {
			platform,
			redirect_url: redirectUrl,
		})
	}

	async finalizeConnection(code: string, platform: string): Promise<OutstandAccountResponse> {
		return this.request<OutstandAccountResponse>('POST', '/social-networks/finalize', {
			code,
			platform,
		})
	}

	// ── Accounts ─────────────────────────────────────────────────────

	async listAccounts(): Promise<OutstandAccountResponse[]> {
		return this.request<OutstandAccountResponse[]>('GET', '/social-accounts')
	}

	async getAccount(accountId: string): Promise<OutstandAccountResponse> {
		return this.request<OutstandAccountResponse>('GET', `/social-accounts/${accountId}`)
	}

	async removeAccount(accountId: string): Promise<void> {
		await this.request<void>('DELETE', `/social-accounts/${accountId}`)
	}

	// ── Publishing ───────────────────────────────────────────────────

	async createPost(payload: OutstandPostPayload): Promise<OutstandPostResponse> {
		return this.request<OutstandPostResponse>('POST', '/posts', payload)
	}

	async deletePost(postId: string): Promise<void> {
		await this.request<void>('DELETE', `/posts/${postId}`)
	}

	// ── Analytics ────────────────────────────────────────────────────

	async getPostAnalytics(postId: string): Promise<OutstandPostAnalytics> {
		return this.request<OutstandPostAnalytics>('GET', `/posts/${postId}/analytics`)
	}

	// ── Media ────────────────────────────────────────────────────────

	async getUploadUrl(mimeType: string): Promise<{ upload_url: string; media_id: string }> {
		return this.request('POST', '/media/upload-url', { mime_type: mimeType })
	}

	async confirmUpload(mediaId: string): Promise<{ url: string }> {
		return this.request('POST', `/media/${mediaId}/confirm`)
	}

	// ── Comments ─────────────────────────────────────────────────────

	async publishComment(postId: string, content: string): Promise<{ id: string }> {
		return this.request('POST', `/posts/${postId}/comments`, { content })
	}

	async getComments(postId: string): Promise<Array<{ id: string; content: string; author: string; created_at: string }>> {
		return this.request('GET', `/posts/${postId}/comments`)
	}

	// ── Webhooks ─────────────────────────────────────────────────────

	verifyWebhook(signature: string, body: string): boolean {
		// TODO: Implement HMAC verification with Outstand webhook secret
		return !!signature && !!body
	}
}

export const outstandService = new OutstandService()
