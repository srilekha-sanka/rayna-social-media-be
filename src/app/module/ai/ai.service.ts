import OpenAI from 'openai'
import fetch from 'node-fetch'
import { fal } from '@fal-ai/client'
import { env } from '../../../db/config/env.config'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { BadRequestError } from '../../errors/api-errors'
import { logger } from '../../common/logger/logging'

const openai = new OpenAI({ apiKey: env.openai.apiKey })

// Configure fal.ai client
if (env.fal.apiKey) {
	fal.config({ credentials: env.fal.apiKey })
}

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

interface ExploreSlideContentResponse {
	overview: {
		headline_words: string[]
		stats: Array<{ bold_text: string; normal_text: string; icon_type: 'star' | 'shield' | 'gift' }>
	}
	slides: Array<{
		product_index: number
		title: string
		subtitle: string
		location_badge: string
	}>
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

	/**
	 * Generate content for explore-style carousel slides where each slide
	 * showcases a different product/activity. Returns per-slide title,
	 * subtitle, location badge, and an overall post caption with hashtags.
	 */
	async generateExploreSlideContent(input: {
		products: Array<{
			name: string
			description: string
			city?: string
			country?: string
			price?: string
			category?: string
		}>
		product_type: string
		platform: string
		template_style: string
	}): Promise<IServiceResponse> {
		if (!env.openai.apiKey) {
			throw new BadRequestError('OPENAI_API_KEY is not configured')
		}

		const systemPrompt = `You are the creative director at Rayna Tours — Dubai's most-booked tours & activities company. You design explore-style carousel posts that showcase MULTIPLE ${input.product_type} in a single visually stunning post.

Always respond in valid JSON format:
{
  "overview": {
    "headline_words": ["word1", "word2", "word3"],
    "stats": [
      { "bold_text": "stat value", "normal_text": "stat label", "icon_type": "star|shield|gift" }
    ]
  },
  "slides": [
    {
      "product_index": 0,
      "title": "Activity Name",
      "subtitle": "short engaging description under 12 words",
      "location_badge": "City or Country"
    }
  ],
  "caption": "overall post caption for the carousel",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "call to action text"
}

RULES:
- overview.headline_words: exactly 3 impactful words that describe the ${input.product_type} theme (e.g., ["Explore.", "Thrilling.", "Activities."]). Each word MUST end with a period. Keep them bold, aspirational, relevant to ${input.product_type}.
- overview.stats: exactly 3 stats about Rayna Tours that build trust (e.g., "4.9+ Rated Experiences", "1000+ Experiences to choose from", "1L+ Customers served & counting"). icon_type must be "star", "shield", or "gift".
- slides: one entry per product (${input.products.length} total). Each slide is a separate activity/product card.
  - title: the activity/product name — short, punchy, 1-4 words MAX. This goes on a DARK TAG over the image.
  - subtitle: an engaging one-liner (under 12 words) that makes someone WANT to try this activity. Paint a vivid picture. NO generic text — be specific to the activity.
  - location_badge: the city or country name shown as an overlay badge on the photo (e.g., "Dubai", "Switzerland", "Vietnam"). Use the product's actual location.
  - product_index: index in the products array (0-based)
- caption: write like a Dubai travel influencer. Hook → variety highlight → FOMO → CTA. Mention the mix of ${input.product_type} available.
- hashtags: 15-20 strategic hashtags mixing brand, ${input.product_type}-specific, geo, and trending tags.
- cta: action-driven CTA for the whole carousel.
- Platform: ${input.platform}
- Template style: ${input.template_style} — keep text concise and visually oriented.`

		const productList = input.products.map((p, i) =>
			`${i + 1}. ${p.name}${p.city ? ` (${p.city})` : ''}${p.country ? `, ${p.country}` : ''}: ${p.description?.slice(0, 120) || 'N/A'}${p.price ? ` — ${p.price}` : ''}`
		).join('\n')

		const userPrompt = `Product type: ${input.product_type}
Platform: ${input.platform}
Number of ${input.product_type}: ${input.products.length}

${input.product_type.charAt(0).toUpperCase() + input.product_type.slice(1)} to feature:
${productList}

Design an explore-style carousel that showcases ALL these ${input.product_type} — one per slide. Make each slide feel like a mini travel poster that makes someone want to book immediately.`

		const result = await this.callOpenAI<ExploreSlideContentResponse>(systemPrompt, userPrompt)

		return { statusCode: 200, payload: result, message: 'Explore slide content generated successfully' }
	}

	async callOpenAIRaw<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
		return this.callOpenAI<T>(systemPrompt, userPrompt)
	}

	/**
	 * Edit an image using Fal.ai Flux Kontext — overlays text on the original photo
	 * without regenerating or distorting the background image.
	 */
	async editImage(input: {
		imageBuffer: Buffer
		prompt: string
		model?: 'flux-kontext' | 'ideogram'
		size?: '1024x1024' | '1024x1536' | '1536x1024'
		quality?: 'low' | 'medium' | 'high'
	}): Promise<Buffer[]> {
		if (!env.fal.apiKey) throw new BadRequestError('FAL_API_KEY is not configured')

		const model = input.model || 'flux-kontext'
		logger.info(`Fal.ai image edit [${model}]: "${input.prompt.slice(0, 80)}..."`)

		const base64Image = `data:image/png;base64,${input.imageBuffer.toString('base64')}`

		let result: any

		if (model === 'ideogram') {
			result = await fal.subscribe('fal-ai/ideogram/v3/edit' as any, {
				input: {
					image_url: base64Image,
					prompt: input.prompt,
					magic_prompt_option: 'ON',
					num_images: 1,
				},
				logs: true,
				onQueueUpdate: (update: any) => {
					if (update.status === 'IN_PROGRESS' && update.logs?.length) {
						logger.info(`Fal.ai ideogram progress: ${update.logs[update.logs.length - 1].message}`)
					}
				},
			}) as any
		} else {
			result = await fal.subscribe('fal-ai/flux-kontext/dev' as any, {
				input: {
					image_url: base64Image,
					prompt: input.prompt,
					num_images: 1,
					output_format: 'png',
				},
				logs: true,
				onQueueUpdate: (update: any) => {
					if (update.status === 'IN_PROGRESS' && update.logs?.length) {
						logger.info(`Fal.ai kontext progress: ${update.logs[update.logs.length - 1].message}`)
					}
				},
			}) as any
		}

		const images = result.data?.images || result.images
		if (!images?.length) throw new BadRequestError('Fal.ai returned no images')

		const buffers: Buffer[] = []
		for (const img of images) {
			const imgRes = await fetch(img.url)
			buffers.push(await imgRes.buffer())
		}

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
