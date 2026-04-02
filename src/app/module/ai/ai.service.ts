import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import os from 'os'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { env } from '../../../db/config/env.config'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

const openai = new OpenAI({ apiKey: env.openai.apiKey })

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
	slides: Array<{ overlay_text: string; cta_text: string; subtitle?: string }>
	caption: string
	hashtags: string[]
	cta: string
}

class AiService {
	async generateCaption(input: CaptionInput): Promise<IServiceResponse> {
		if (!env.openai.apiKey) {
			throw new BadRequestError('OPENAI_API_KEY is not configured')
		}
		console.log('Generating caption with input:', input)

		const systemPrompt = `You are the head of social media marketing at Rayna Tours, Dubai's top-rated tours & activities company. You write captions that SELL — every post should make people stop scrolling, feel the FOMO, and hit "Book Now".

You write like a top travel influencer who genuinely loves Dubai — not like a corporate brand. Your captions feel personal, exciting, and urgent without being pushy.

Always respond in valid JSON format with this exact structure:
{
  "captions": ["caption1", "caption2", "caption3"],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "call to action text"
}

Caption Writing Rules:
- Generate exactly 3 caption variants (short, medium, long)
- SHORT: 1-2 punchy lines that stop the scroll. Use curiosity or a bold statement. End with CTA.
- MEDIUM: Hook → experience highlight → social proof/urgency → CTA. 3-5 lines.
- LONG: Storytelling format — paint the picture so vivid they can FEEL the experience. Include sensory details (what they'll see, feel, taste). End with urgency + CTA.
- EVERY caption MUST include: a scroll-stopping hook in the first line, at least one emoji per sentence, a clear call-to-action
- Use power words: "limited spots", "selling fast", "you won't believe", "insider tip", "only in Dubai", "bucket list", "once in a lifetime"
- ${input.offer ? `HIGHLIGHT THE OFFER — make it feel like they\'d be crazy to miss it. Use "🔥" or "⚡" near the offer.` : 'If no specific offer, create urgency with "Book today & save" or "DM us for exclusive rates"'}
- Tone: ${input.tone || 'excited travel influencer — think "your cool friend who lives in Dubai and knows all the best spots"'}
- Platform: ${input.platform} (respect character limits)
- NEVER sound robotic, generic, or corporate. No "embark on a journey" or "immerse yourself" — talk like a real person.
- Use line breaks for readability. Each new thought = new line.

Hashtag Rules:
- Generate 15-20 hashtags strategically mixed:
  - 3-4 brand: #RaynaTours #RaynaExperiences #VisitDubaiWithRayna
  - 3-4 high-volume discovery: #Dubai #DubaiLife #DubaiTravel #ThingsToDo
  - 3-4 niche/product-specific: based on the actual experience
  - 3-4 emotional/trending: #BucketList #TravelGoals #FOMO #WeekendVibes
  - 2-3 location-specific: #DubaiMarina #JBR #Atlantis etc.
- Put the most important hashtags first

CTA Rules:
- SELL intent → action-driven: "Book Now — Link in Bio 🔗", "Tap to Book ⚡", "Save this + Book later 📌"
- VALUE intent → curiosity: "Save this for your Dubai trip 📌", "Share with someone who needs this ✈️"
- ENGAGEMENT intent → interactive: "Tag someone you'd do this with 👇", "Drop a 🔥 if this is on your bucket list", "Would you try this? Yes or No 👇"`

		const userPrompt = `Product: ${input.product_name}
Description: ${input.product_description}
${input.usp ? `What makes it special: ${input.usp}` : ''}
${input.offer ? `Current offer: ${input.offer} — MAKE THIS THE HERO OF THE CAPTION` : ''}
Intent: ${input.intent}
Platform: ${input.platform}

Write 3 caption variants that would make someone book this RIGHT NOW. Think: what would make YOU stop scrolling and tap "Book Now"?`

		const result = await this.callOpenAI<CaptionResponse>(systemPrompt, userPrompt)
console.log('Generating caption with input:', systemPrompt, userPrompt)
		return { statusCode: 200, payload: result, message: 'Caption generated successfully' }
	}

	
	async generateHashtags(input: HashtagInput): Promise<IServiceResponse> {
		if (!env.openai.apiKey) {
			throw new BadRequestError('OPENAI_API_KEY is not configured')
		}

		const systemPrompt = `You are a social media growth strategist for Rayna Tours, Dubai's leading tours & activities company. You know exactly which hashtags drive reach, discovery, and bookings.

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

Strategy:
- 20-25 hashtags total, ordered by importance
- brand (3-4): #RaynaTours #RaynaExperiences #VisitDubaiWithRayna + 1 campaign-specific
- product (4-5): specific to this experience — what someone would actually search for
- geo (4-5): city, landmarks, neighborhoods near the experience. Be SPECIFIC — #AtlantisDubai not just #Dubai
- trending (4-5): travel/lifestyle hashtags that are currently high-volume: #TravelGoals #BucketList #DubaiLife #WeekendPlans #ExploreMore
- emotional (3-4): hashtags that match the FEELING: #AdventureAwaits #MakingMemories #LiveYourBestLife #NoFOMO
- Platform: ${input.platform} (Instagram: use all 25, X/Twitter: pick top 3-4 only)
- NEVER use dead/low-volume hashtags. Every hashtag should have real search volume.`

		const userPrompt = `Product: ${input.product_name}
${input.category ? `Category: ${input.category}` : ''}
${input.city ? `City: ${input.city}` : ''}
Platform: ${input.platform}

Generate hashtags that will maximize reach AND attract people who are actually ready to book activities in Dubai.`

		const result = await this.callOpenAI(systemPrompt, userPrompt)

		return { statusCode: 200, payload: result, message: 'Hashtags generated successfully' }
	}

	async generateCarouselContent(input: CarouselCaptionInput): Promise<IServiceResponse> {
		if (!env.openai.apiKey) {
			throw new BadRequestError('OPENAI_API_KEY is not configured')
		}

		const systemPrompt = `You are the creative director at Rayna Tours — Dubai's most-booked tours & activities company. You design carousel posts that CONVERT. Every carousel should tell a mini-story that makes someone swipe through ALL slides and hit "Book Now" at the end.

Always respond in valid JSON format:
{
  "slides": [
    { "overlay_text": "short title for the slide", "cta_text": "Book Now", "subtitle": "one-line description" }
  ],
  "caption": "overall post caption",
  "hashtags": ["#hashtag1"],
  "cta": "main CTA text"
}

Slide Rules:
- overlay_text: bold, clean text that goes ON the image. Keep it 2-6 words MAX. It must be readable at a glance on a phone screen.
- subtitle: one punchy line (under 10 words) that adds context or creates desire. Make it FEEL something.
- FIRST SLIDE: Product name as overlay_text + "Book Now" CTA + subtitle that hooks curiosity (e.g., "Dubai's #1 rated waterpark experience")
- MIDDLE SLIDES: Each slide = one irresistible highlight. Pick the most VISUAL, exciting aspects. overlay_text should name the highlight. No CTA on middle slides. No subtitle on middle slides.
- LAST SLIDE: Urgency or value-driven closing line as overlay_text (e.g., "Starting from AED ${input.price}") + "Book Now" CTA + subtitle with urgency (e.g., "Limited slots available this week")
- Do NOT include prices on any slide except the last one
- Make the swipe feel like a journey: hook → best moments → close the deal

Caption Rules (this goes in the post body, not on images):
- Write like a Dubai travel influencer, NOT a brand
- First line = scroll-stopping hook (question, bold claim, or curiosity gap)
- Paint the experience so vividly they can FEEL it — what they'll see, do, feel
- ${input.offer ? `HIGHLIGHT the offer with 🔥 — make it feel like a steal` : 'Create urgency: "Book this week" or "Save this for your Dubai trip"'}
- End with a strong CTA: "Link in bio 🔗" or "DM us to book ✨"
- Use emojis naturally (not excessive)
- Line breaks between each thought for readability

Hashtag Rules:
- 15-20 hashtags, strategically mixed:
  - Brand: #RaynaTours #RaynaExperiences
  - Discovery: #Dubai #DubaiLife #ThingsToDoInDubai
  - Product-specific: based on the experience
  - Emotional: #BucketList #TravelGoals #WeekendVibes
  - Location: specific landmarks/areas near the experience`

		const userPrompt = `Product: ${input.product_name}
Description: ${input.product_description}
Price: AED ${input.price}
${input.offer ? `Offer: ${input.offer} — use this to create urgency in the last slide and caption` : ''}
Intent: ${input.intent}
Platform: ${input.platform}
Number of slides: ${input.slide_count}

Design a ${input.slide_count}-slide carousel that makes someone book this experience TODAY. Think: what would make a tourist in Dubai stop scrolling, swipe through every slide, and tap "Book Now"?`

		const result = await this.callOpenAI<CarouselResponse>(systemPrompt, userPrompt)

		return { statusCode: 200, payload: result, message: 'Carousel content generated successfully' }
	}

	async callOpenAIRaw<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
		return this.callOpenAI<T>(systemPrompt, userPrompt)
	}

	/**
	 * Edit/transform an image using OpenAI gpt-image-1.
	 * Takes a reference image (Buffer) + design prompt → returns transformed image as Buffer.
	 */
	async editImage(input: {
		imageBuffer: Buffer
		prompt: string
		size?: '1024x1024' | '1024x1536' | '1536x1024'
		quality?: 'low' | 'medium' | 'high'
	}): Promise<Buffer[]> {
		if (!env.openai.apiKey) throw new BadRequestError('OPENAI_API_KEY is not configured')

		logger.info(`OpenAI image edit: "${input.prompt.slice(0, 80)}..."`)

		// Trim prompt for image model — remove verbose instructions, keep design direction
		const trimmedPrompt = input.prompt
			.replace(/DO NOT:[\s\S]*?OUTPUT:/g, 'OUTPUT:')
			.replace(/Avoid:[\s\S]*?$/gm, '')
			.slice(0, 4000)

		// Direct HTTP request to bypass SDK's FormData issues on Node 16
		const form = new FormData()
		form.append('model', 'gpt-image-1')
		form.append('prompt', trimmedPrompt)
		form.append('size', input.size || '1024x1536')
		form.append('quality', input.quality || 'high')
		form.append('image', input.imageBuffer, { filename: 'reference.png', contentType: 'image/png' })

		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 600_000) // 10 min timeout for high quality

		let response: import('node-fetch').Response
		try {
			response = await fetch('https://api.openai.com/v1/images/edits', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.openai.apiKey}`,
					...form.getHeaders(),
				},
				body: form,
				signal: controller.signal as any,
			})
		} catch (err: any) {
			if (err.name === 'AbortError') throw new BadRequestError('OpenAI image edit timed out after 10 minutes')
			throw err
		} finally {
			clearTimeout(timeout)
		}

		if (!response.ok) {
			const errorBody = await response.text()
			logger.error(`OpenAI image edit failed (${response.status}): ${errorBody}`)
			throw new BadRequestError(`OpenAI image edit failed (${response.status}): ${errorBody}`)
		}

		const json = await response.json() as { data: Array<{ b64_json?: string; url?: string }> }

		const buffers: Buffer[] = []
		for (const img of json.data || []) {
			if (img.b64_json) {
				buffers.push(Buffer.from(img.b64_json, 'base64'))
			} else if (img.url) {
				const imgRes = await fetch(img.url)
				const arrBuf = await imgRes.buffer()
				buffers.push(arrBuf)
			}
		}

		if (!buffers.length) throw new BadRequestError('OpenAI image edit returned no images')

		return buffers
	}

	private async callOpenAI<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
		const response = await openai.chat.completions.create({
			model: env.openai.model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			temperature: 0.7,
			response_format: { type: 'json_object' },
		})

		const content = response.choices[0]?.message?.content

		if (!content) {
			throw new BadRequestError('No response from AI')
		}

		return JSON.parse(content) as T
	}
}

export const aiService = new AiService()
