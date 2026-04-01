import { env } from '../../../db/config/env.config'
import { BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

const BASE_URL = 'https://api.freepik.com/v1'

interface FreepikSearchResult {
	id: number
	title: string
	url: string
	image: {
		source: { url: string }
	}
	thumbnails: Array<{ url: string }>
}

interface FreepikSearchResponse {
	data: FreepikSearchResult[]
	meta: { current_page: number; last_page: number; per_page: number; total: number }
}

interface FreepikAIImageResponse {
	data: Array<{ base64: string; has_nsfw: boolean }>
	meta: { seed: number }
}

interface StockSearchInput {
	term: string
	page?: number
	limit?: number
	orientation?: 'landscape' | 'portrait' | 'square'
	content_type?: 'photo' | 'vector' | 'psd'
}

interface AIImageInput {
	prompt: string
	style?: 'photo' | 'digital-art' | '3d' | 'painting'
	size?: 'square_1_1' | 'landscape_4_3' | 'landscape_16_9' | 'portrait_3_4' | 'portrait_9_16'
	num_images?: number
	negative_prompt?: string
}

class FreepikService {
	get enabled(): boolean {
		return !!env.freepik.apiKey
	}

	private get headers(): Record<string, string> {
		return {
			'x-freepik-api-key': env.freepik.apiKey,
			'Accept': 'application/json',
		}
	}

	async searchStock(input: StockSearchInput): Promise<{
		results: Array<{ id: number; title: string; preview_url: string; thumbnail_url: string }>
		pagination: { page: number; total_pages: number; total: number }
	}> {
		if (!this.enabled) throw new BadRequestError('FREEPIK_API_KEY is not configured')

		const params = new URLSearchParams({
			locale: 'en',
			page: String(input.page || 1),
			limit: String(input.limit || 20),
			term: input.term,
			order: 'relevance',
		})

		if (input.content_type !== undefined) {
			params.append(`filters[content_type][${input.content_type}]`, '1')
		} else {
			params.append('filters[content_type][photo]', '1')
		}

		if (input.orientation) {
			params.append(`filters[orientation][${input.orientation}]`, '1')
		}

		const url = `${BASE_URL}/resources?${params.toString()}`
		logger.info(`Freepik stock search: ${input.term}`)

		const response = await fetch(url, { headers: this.headers })
		if (!response.ok) {
			const body = await response.text()
			throw new BadRequestError(`Freepik search failed (${response.status}): ${body}`)
		}

		const json = (await response.json()) as FreepikSearchResponse

		return {
			results: json.data.map((item) => ({
				id: item.id,
				title: item.title,
				preview_url: item.image?.source?.url || '',
				thumbnail_url: item.thumbnails?.[0]?.url || item.image?.source?.url || '',
			})),
			pagination: {
				page: json.meta.current_page,
				total_pages: json.meta.last_page,
				total: json.meta.total,
			},
		}
	}

	async downloadResource(resourceId: number): Promise<string> {
		if (!this.enabled) throw new BadRequestError('FREEPIK_API_KEY is not configured')

		const url = `${BASE_URL}/resources/${resourceId}/download`
		const response = await fetch(url, { headers: this.headers })
		if (!response.ok) {
			const body = await response.text()
			throw new BadRequestError(`Freepik download failed (${response.status}): ${body}`)
		}

		const json = (await response.json()) as { data: { url: string } }
		return json.data.url
	}

	async generateAIImage(input: AIImageInput): Promise<Buffer[]> {
		if (!this.enabled) throw new BadRequestError('FREEPIK_API_KEY is not configured')

		const body = {
			prompt: input.prompt,
			negative_prompt: input.negative_prompt || 'blurry, low quality, text, watermark',
			image: {
				size: input.size || 'square_1_1',
			},
			styling: {
				style: input.style || 'photo',
			},
			num_images: input.num_images || 1,
		}

		logger.info(`Freepik AI image generation: "${input.prompt.slice(0, 80)}..."`)

		const response = await fetch(`${BASE_URL}/ai/text-to-image`, {
			method: 'POST',
			headers: { ...this.headers, 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const errorBody = await response.text()
			throw new BadRequestError(`Freepik AI generation failed (${response.status}): ${errorBody}`)
		}

		const json = (await response.json()) as FreepikAIImageResponse

		return json.data
			.filter((item) => !item.has_nsfw)
			.map((item) => Buffer.from(item.base64, 'base64'))
	}
}

export const freepikService = new FreepikService()
