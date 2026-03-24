import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../../db/config/env.config'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { BadRequestError } from '../../errors/api-errors'

const anthropic = new Anthropic({ apiKey: env.claude.apiKey })

interface CaptionInput {
	product_name: string
	product_description: string
	usp?: string
	offer?: string
	intent: 'SELL' | 'VALUE' | 'ENGAGEMENT'
	platform: string
	tone?: string
}

interface HashtagInput {
	product_name: string
	category?: string
	city?: string
	platform: string
}

interface CarouselCaptionInput {
	product_name: string
	product_description: string
	price: string
	offer?: string
	intent: 'SELL' | 'VALUE' | 'ENGAGEMENT'
	platform: string
	slide_count: number
}

interface CaptionResponse {
	captions: string[]
	hashtags: string[]
	cta: string
}

interface CarouselResponse {
	slides: Array<{ overlay_text: string; cta_text: string }>
	caption: string
	hashtags: string[]
	cta: string
}

class AiService {
	async generateCaption(input: CaptionInput): Promise<IServiceResponse> {
		if (!env.claude.apiKey) {
			throw new BadRequestError('CLAUDE_API_KEY is not configured')
		}

		const systemPrompt = `You are a social media marketing expert for Rayna Tours, a Dubai-based tours and activities company. Generate engaging social media captions.

Always respond in valid JSON format with this exact structure:
{
  "captions": ["caption1", "caption2", "caption3"],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "call to action text"
}

Rules:
- Generate exactly 3 caption variants (short, medium, long)
- Generate 10-15 relevant hashtags
- CTA should match the intent: SELL → "Book Now" style, VALUE → "Learn More" style, ENGAGEMENT → "Tell us / Tag a friend" style
- Tone: ${input.tone || 'professional yet friendly'}
- Platform: ${input.platform} (respect character limits)
- Respond with ONLY the JSON object, no other text`

		const userPrompt = `Product: ${input.product_name}
Description: ${input.product_description}
${input.usp ? `USP: ${input.usp}` : ''}
${input.offer ? `Offer: ${input.offer}` : ''}
Intent: ${input.intent}
Platform: ${input.platform}

Generate captions, hashtags, and CTA for this product.`

		const result = await this.callClaude<CaptionResponse>(systemPrompt, userPrompt)

		return { statusCode: 200, payload: result, message: 'Caption generated successfully' }
	}

	async generateHashtags(input: HashtagInput): Promise<IServiceResponse> {
		if (!env.claude.apiKey) {
			throw new BadRequestError('CLAUDE_API_KEY is not configured')
		}

		const systemPrompt = `You are a social media hashtag expert. Generate relevant, high-performing hashtags for tourism content.

Always respond in valid JSON format:
{
  "hashtags": {
    "brand": ["#RaynaTours", "#VisitDubai"],
    "product": ["#product-specific"],
    "geo": ["#Dubai", "#UAE"],
    "trending": ["#trending-relevant"]
  },
  "all": ["#hashtag1", "#hashtag2"]
}

Rules:
- 10-15 hashtags total
- Mix of brand, product, geo, and trending hashtags
- Platform: ${input.platform} (Instagram allows 30, X/Twitter 2-3 recommended)
- Respond with ONLY the JSON object, no other text`

		const userPrompt = `Product: ${input.product_name}
${input.category ? `Category: ${input.category}` : ''}
${input.city ? `City: ${input.city}` : ''}
Platform: ${input.platform}`

		const result = await this.callClaude(systemPrompt, userPrompt)

		return { statusCode: 200, payload: result, message: 'Hashtags generated successfully' }
	}

	async generateCarouselContent(input: CarouselCaptionInput): Promise<IServiceResponse> {
		if (!env.claude.apiKey) {
			throw new BadRequestError('CLAUDE_API_KEY is not configured')
		}

		const systemPrompt = `You are a social media content designer for Rayna Tours. Generate text content for a carousel post (multiple image slides).

Always respond in valid JSON format:
{
  "slides": [
    { "overlay_text": "short punchy text for slide", "cta_text": "CTA for slide" }
  ],
  "caption": "overall post caption",
  "hashtags": ["#hashtag1"],
  "cta": "main CTA text"
}

Rules:
- Each slide overlay_text should be 3-8 words MAX (it goes ON the image)
- First slide: hook/attention grabber
- Middle slides: key selling points / features
- Last slide: CTA + price/offer
- Caption: full post text (not on images)
- Intent drives the messaging: SELL → urgency + offer, VALUE → benefits + features, ENGAGEMENT → questions + community
- Respond with ONLY the JSON object, no other text`

		const userPrompt = `Product: ${input.product_name}
Description: ${input.product_description}
Price: ${input.price}
${input.offer ? `Offer: ${input.offer}` : ''}
Intent: ${input.intent}
Platform: ${input.platform}
Number of slides: ${input.slide_count}

Generate carousel content for ${input.slide_count} slides.`

		const result = await this.callClaude<CarouselResponse>(systemPrompt, userPrompt)

		return { statusCode: 200, payload: result, message: 'Carousel content generated successfully' }
	}

	private async callClaude<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
		const response = await anthropic.messages.create({
			model: env.claude.model,
			max_tokens: 1024,
			system: systemPrompt,
			messages: [
				{ role: 'user', content: userPrompt },
			],
		})

		const textBlock = response.content.find((block) => block.type === 'text')

		if (!textBlock || textBlock.type !== 'text') {
			throw new BadRequestError('No response from AI')
		}

		const jsonStr = this.extractJson(textBlock.text)

		return JSON.parse(jsonStr) as T
	}

	/**
	 * Extract JSON from Claude's response — handles cases where
	 * Claude wraps JSON in markdown code blocks.
	 */
	private extractJson(text: string): string {
		const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
		if (codeBlockMatch) {
			return codeBlockMatch[1].trim()
		}

		const jsonMatch = text.match(/\{[\s\S]*\}/)
		if (jsonMatch) {
			return jsonMatch[0]
		}

		return text.trim()
	}
}

export const aiService = new AiService()
