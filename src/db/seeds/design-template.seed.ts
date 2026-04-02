import DesignTemplate from '../../app/module/content-studio/design-template.model'
import { logger } from '../../app/common/logger/logging'

const DESIGN_TEMPLATES = [
	// ─── 1. Explorer Minimal ────────────────────────────────────
	{
		name: 'Explorer Minimal',
		slug: 'explorer-minimal',
		description: 'Cinematic wide-angle, clean luxury, Gen Z aesthetic with bold sans-serif + script accent',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `Create a high-end travel poster for {{destination}} in a bold Instagram marketing style.

Scene:
A cinematic wide-angle view of a serene landmark or iconic location at {{destination}} during sunset. The sky is dramatic with orange, pink, and teal clouds. The main subject is centered with perfect symmetry and reflection in water. Soft mist and distant hills in the background.

Style:
Modern travel advertisement, minimal yet bold, Gen Z aesthetic, clean luxury design, high contrast, sharp details, cinematic lighting, ultra-realistic.

Text Layout:
Top center (small, spaced letters):
"{{destination}}"

Main headline (large, bold, uppercase, centered):
"{{headline}}"

Subtext below headline (small caps):
"{{subheadline}}"

Highlight banner (center or lower third, rounded rectangle, soft yellow or beige):
"{{price}} | {{duration}}"

Bottom:
Add a clean luxury travel logo placeholder (minimal white logo style) with text:
"{{brand_name}}"

Typography:
- Mix of bold sans-serif (for headings)
- Elegant serif or script accent for the main word
- Clean spacing, premium alignment

Color grading:
Teal and orange cinematic tones, slightly desaturated for luxury feel

Composition:
Poster should be vertical (4:5 Instagram ratio), balanced, uncluttered, premium branding

Lighting:
Soft glow on subject, natural reflections, slightly dreamy atmosphere

Avoid:
Overcrowding, too many colors, cheap flyer look, excessive text`,
			dynamic_fields: ['destination', 'headline', 'subheadline', 'price', 'duration', 'brand_name'],
		},
		sort_order: 1,
	},

	// ─── 2. Lifestyle Editorial ─────────────────────────────────
	{
		name: 'Lifestyle Editorial',
		slug: 'lifestyle-editorial',
		description: 'Emotional storytelling with CTA button, human element, editorial magazine feel',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior creative director and performance marketing designer specializing in high-converting travel advertisements for Instagram.

Your task is to transform any given travel image into a premium, clean, modern promotional poster that matches current Instagram trends (2025-2026).

Destination: {{destination}}

Design Principles:
- Minimal, cinematic, luxury aesthetic
- Clean typography, strong hierarchy
- Emotional storytelling with subtle sales intent
- Avoid clutter, maintain negative space
- Use soft overlays for readability (dark gradient or blur)

Layout Structure:

1. Headline (Top Section):
- Large, bold, clean sans-serif font
- Destination name: "{{headline}}"
- Center aligned or slightly top-aligned
- Add a subtle background blur/overlay behind text if needed

2. Tagline (Below headline):
- Short emotional phrase: "{{tagline}}"
- Lighter weight font

3. Description (Mid/Lower Left):
- 2-4 lines max
- Conversational, premium tone
- Focus on experience, not features
- Example:
  "From hidden gems to iconic views,
   discover unforgettable moments."

4. CTA Button:
- Rounded rectangle
- Text: "BOOK NOW"
- High contrast (white or soft beige)
- Positioned mid-lower area

5. Branding:
- Add travel company logo at bottom: "{{brand_name}}"
- Small, subtle, clean
- Include optional tagline: "{{tagline}}"

6. Optional Human Element:
- Add a traveler figure (natural, not posed)
- Positioned bottom-right or foreground
- Should enhance lifestyle feel, not distract

Typography:
- Headline: Bold sans-serif (modern, clean)
- Accent/tagline: Light or medium weight
- Maintain proper spacing and alignment

Color Grading:
- Cinematic tones (teal/orange or natural warm tones)
- Slight desaturation for premium feel

Composition Rules:
- Maintain focus on destination
- Keep text within safe margins (Instagram 4:5 ratio)
- Ensure readability on mobile

DO NOT:
- Overcrowd with text
- Use too many colors
- Make it look like a cheap flyer
- Use heavy shadows or outdated styles

OUTPUT:
Generate a polished, high-end Instagram travel ad poster with balanced layout, clean branding, and strong visual appeal.`,
			dynamic_fields: ['destination', 'headline', 'tagline', 'brand_name'],
		},
		sort_order: 2,
	},

	// ─── 3. Bold Adventure ──────────────────────────────────────
	{
		name: 'Bold Adventure',
		slug: 'bold-adventure',
		description: 'Rugged trek/event poster style, youth-focused, script headline with structured info layout',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior adventure travel designer and social media performance marketer.

Your task is to convert any given outdoor/travel image into a bold, high-converting trek/event poster suitable for Instagram.

Destination: {{destination}}

Design Style:
- Adventure, raw, bold, slightly rugged aesthetic
- Youth-focused (Gen Z + millennial travelers)
- Informative but visually appealing
- Poster-style layout (not minimal luxury)

Layout Structure:

1. Logo (Top Center or Top Left):
- Small but visible
- "{{brand_name}}"
- White or light color for contrast

2. Main Title (Hero Text):
- Large, bold, handwritten/script or strong display font
- "{{headline}}"
- Center aligned
- High contrast (white or off-white)
- Slight shadow or glow for readability

3. Pricing Section:
- Mid section, clear hierarchy
- "{{price}}"
- Price should stand out (bold + bigger font)

4. Includes Section:
- Clear list format (single line or stacked)
- "{{includes}}"
- Medium weight font

5. Date + Contact Info (Bottom):
- Small but readable
- Structured layout:
  "{{dates}}"
  "{{contact}}"

6. Background Treatment:
- Keep original image dominant
- Add slight dark gradient overlay (top or bottom) for text clarity

Typography:
- Title: Script or bold display font
- Body: Clean sans-serif
- Maintain clear hierarchy (Title > Price > Includes > Details)

Color Style:
- Natural tones (greens, browns, sky blues)
- White or yellow text for contrast
- Optional accent color (yellow/orange) for highlights

Composition Rules:
- Centered layout
- Text stacked vertically
- Maintain readability on mobile (Instagram 4:5 or 1:1)

Optional Enhancements:
- Add subtle vignette
- Slight contrast boost for dramatic effect

DO NOT:
- Over-minimalize (this is not luxury style)
- Use too many fonts
- Clutter with unnecessary graphics
- Reduce readability

OUTPUT:
Generate a bold, clean, adventure-style trek poster with strong typography, clear information hierarchy, and high visual impact suitable for Instagram promotions.`,
			dynamic_fields: ['destination', 'headline', 'price', 'includes', 'dates', 'contact', 'brand_name'],
		},
		sort_order: 3,
	},

	// ─── 4. Heritage Cinematic ──────────────────────────────────
	{
		name: 'Heritage Cinematic',
		slug: 'heritage-cinematic',
		description: 'Cultural, calligraphy headline, serif fonts, museum campaign aesthetic, timeless elegance',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior brand designer specializing in heritage, cultural, and cinematic travel posters.

Your task is to transform any destination image into a premium heritage-style travel poster inspired by editorial museum campaigns and cultural tourism branding.

Destination: {{destination}}

Design Style:
- Cultural, elegant, timeless
- Cinematic and slightly dramatic
- Premium heritage aesthetic (not modern minimal, not casual)
- Strong typography hierarchy

Layout Structure:

1. Artistic Headline (Top Section):
- Large expressive script or calligraphy-style font
- "{{headline}}"
- Should feel artistic and slightly overlapping the sky/background
- Use soft cream or off-white color

2. Main Title (Center):
- Large serif font (cinematic, elegant)
- "{{subheadline}}"
- All caps, well spaced
- Strong and authoritative

3. Subtitle (Below Title):
- Smaller serif font
- "{{tagline}}"
- Optional decorative divider (line or ornament)

4. Background Treatment:
- Use the original image (temple / landscape)
- Add slight vignette or dark gradient at bottom
- Enhance contrast and depth for cinematic feel

5. Information Section (Bottom Left):
- "Includes:"
- "{{includes}}"
- Use sans-serif font for readability

6. Date / Duration / Price (Bottom Right):
- Structured blocks:
  "{{duration}}"
  "{{price}}"
- Keep alignment clean and balanced

7. Branding (Bottom Center or Corner):
- "{{brand_name}}"
- Add tagline: "{{tagline}}"
- Minimal, elegant, not overpowering

Typography Rules:
- Script font -> emotional headline
- Serif font -> main title (cinematic feel)
- Sans-serif -> details (clean readability)

Color Palette:
- Cream / off-white text
- Gold accents (optional)
- Natural tones from image (no neon colors)

Composition Rules:
- Maintain center focus on monument
- Keep text breathable (use negative space)
- Ensure mobile readability (Instagram 4:5)

DO NOT:
- Use flashy or modern fonts
- Overcrowd layout
- Use bright or distracting colors
- Make it look like a cheap travel flyer

OUTPUT:
Generate a cinematic, heritage-style travel poster that feels premium, cultural, and timeless, suitable for Instagram marketing.`,
			dynamic_fields: ['destination', 'headline', 'subheadline', 'tagline', 'includes', 'duration', 'price', 'brand_name'],
		},
		sort_order: 4,
	},

	// ─── 5. Brush Script Escape ─────────────────────────────────
	{
		name: 'Brush Script Escape',
		slug: 'brush-script-escape',
		description: 'Bold brush/script hero text, structured info blocks, adventure-clean style',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior travel marketing designer specializing in high-converting Instagram posters.

Your task is to transform any destination image into a bold adventure-style travel poster using a brush-script headline and structured layout.

Destination: {{destination}}

Design Style:
- Clean, bold, adventure aesthetic
- Youth-focused, high readability
- Slightly rugged but premium
- Strong visual hierarchy

Layout Structure:

1. Logo (Top Center):
- Small travel brand logo
- "{{brand_name}}"
- White color, minimal

2. Main Headline (Hero Text):
- Large brush/script font (handwritten style)
- "{{headline}}"
- Center aligned
- White or off-white color
- Slight shadow or glow for contrast
- This is the most dominant element

3. Pricing Section (Center):
- Small label: "Starting From"
- Bold value: "{{price}}"
- Clear hierarchy (price larger than label)

4. Includes Section:
- Title: "Includes"
- Content: "{{includes}}"
- Clean sans-serif font
- Medium size, easy to scan

5. Date / Duration / Contact (Bottom):
- "{{dates}} | {{duration}}"
- "{{contact}}"
- Structured horizontally or stacked

6. Background Treatment:
- Use original destination image (temple/beach/jungle)
- Add subtle dark gradient at bottom for readability
- Enhance contrast slightly

Typography Rules:
- Headline: Brush/script font (like "Playlist Script", "Brush Script", "Pacifico")
- Body: Clean sans-serif (Montserrat / Poppins)
- Maintain spacing and alignment

Color Palette:
- White/off-white text
- Optional accent: yellow/orange for highlights
- Natural tones from image

Composition Rules:
- Keep text centered vertically
- Maintain breathing space
- Optimize for Instagram (4:5 ratio)

DO NOT:
- Overcrowd the design
- Use too many fonts
- Make it look like a cheap flyer
- Reduce readability

OUTPUT:
Generate a bold, clean, Instagram-ready travel poster with a strong brush-script headline and structured information layout for {{brand_name}}.`,
			dynamic_fields: ['destination', 'headline', 'price', 'includes', 'dates', 'duration', 'contact', 'brand_name'],
		},
		sort_order: 5,
	},
]

export const seedDesignTemplates = async (): Promise<void> => {
	try {
		const existingCount = await DesignTemplate.count()

		if (existingCount > 0) {
			logger.info(`[Seed] Skipping design template seed — ${existingCount} templates already exist`)
			return
		}

		await DesignTemplate.bulkCreate(DESIGN_TEMPLATES)
		logger.info(`[Seed] Seeded ${DESIGN_TEMPLATES.length} design templates`)
	} catch (error) {
		logger.error('[Seed] Failed to seed design templates:', error)
	}
}

export const reseedDesignTemplates = async (): Promise<void> => {
	try {
		await DesignTemplate.destroy({ where: {}, force: true })
		logger.info('[Seed] Cleared existing design templates')

		await DesignTemplate.bulkCreate(DESIGN_TEMPLATES)
		logger.info(`[Seed] Re-seeded ${DESIGN_TEMPLATES.length} design templates`)
	} catch (error) {
		logger.error('[Seed] Failed to re-seed design templates:', error)
	}
}
