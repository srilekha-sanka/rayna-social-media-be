import DesignTemplate from '../../app/module/content-studio/design-template.model'
import { logger } from '../../app/common/logger/logging'

const DESIGN_TEMPLATES = [
	// ─── 1. Explorer Minimal (HTML) ────────────────────────────────────
	{
		name: 'Explorer Minimal',
		slug: 'explorer-minimal',
		renderer: 'html' as const,
		description: 'Bold cinematic travel ad with script+sans combo headline, yellow accent banner, split contact footer',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior travel marketing designer specializing in high-converting Instagram travel posters with a bold, cinematic adventure-marketing style.

Your task is to transform ANY destination image into a bold, high-end Instagram travel poster for "{{brand_name}}".

The design must follow a STRICT reusable layout system and work consistently across ALL types of images WITHOUT heavy color grading.

========================
PRIMARY OBJECTIVE
========================
Create a bold, high-converting Instagram travel poster that:
- Feels youthful, vibrant, and scroll-stopping
- Uses cinematic but natural visual style
- Maintains strong readability on any background
- Works as a reusable design system

========================
LAYOUT STRUCTURE (MANDATORY)
========================

1. TOP LABEL (Small, minimal)
- "{{destination}}"
- Top center, small uppercase sans-serif, spaced letters
- White with slight transparency

2. BRAND LOGO (Top)
- "{{brand_name}}" at top center or top left
- Small, clean, white
- Keep original proportions

3. HERO HEADLINE (Main Focus)
- Script accent word: "Explore" (yellow/gold accent)
- Bold destination: "{{headline}}" (large bold uppercase sans-serif)
- Center aligned, script slightly overlapping bold text
- Very subtle shadow for readability

4. DESTINATIONS SUBTEXT
- "{{subheadline}}"
- Small uppercase sans-serif, bullet-separated
- White, slightly muted

5. HIGHLIGHT BANNER (Important)
- Rounded rectangle, soft yellow/warm beige
- "STARTING FROM {{price}} | {{duration}}"
- Bold sans-serif, high readability
- Center or lower-third placement

6. CONTACT FOOTER
- Left side: "{{contact}}"
- Small sans-serif, white
- Bottom aligned

========================
BACKGROUND RULES (CRITICAL)
========================
- Use original image as-is
- Add VERY subtle dark gradient at bottom for text clarity
- Optional slight vignette
- NO heavy color grading or artificial filters

========================
COLOR SYSTEM
========================
- Primary text: White/off-white
- Accent: Yellow/gold for script word and highlight banner only
- Natural environment colors must dominate

========================
TYPOGRAPHY RULES
========================
- Max 2-3 fonts:
  1. Script → accent word ("Explore")
  2. Bold sans-serif → main destination name
  3. Clean sans-serif → all other text
- Hierarchy: Headline > Banner > Subtext > Footer

========================
OUTPUT
========================
Generate a bold, high-converting Instagram travel poster with:
- Script + bold sans combo headline
- Yellow accent highlight banner
- Split contact footer
- {{brand_name}} branding
- Universal adaptability across all images`,
			dynamic_fields: ['destination', 'headline', 'subheadline', 'price', 'duration', 'contact', 'brand_name'],
		},
		sort_order: 1,
	},

	// ─── 2. Lifestyle Editorial (HTML) ─────────────────────────────────
	{
		name: 'Lifestyle Editorial',
		slug: 'lifestyle-editorial',
		renderer: 'html' as const,
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

	// ─── 3. Bold Adventure (HTML) ──────────────────────────────────────
	{
		name: 'Bold Adventure',
		slug: 'bold-adventure',
		renderer: 'html' as const,
		description: 'Bold adventure trek poster, script headline, accent-colored includes, pill-style footer',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior adventure travel designer and social media performance marketer specializing in high-converting Instagram travel and trek posters.

Your task is to transform ANY outdoor/travel image into a bold, high-impact adventure-style promotional poster for "{{brand_name}}".

The design must follow a STRICT reusable layout system and must work consistently across ALL types of outdoor images (treks, mountains, forests, beaches, valleys, deserts) WITHOUT heavy color grading.

========================
PRIMARY OBJECTIVE
========================
Create a bold, youthful, and high-converting trek/event poster that:
- Feels adventurous, raw, and energetic
- Maintains strong readability on any background
- Uses structured information hierarchy
- Preserves natural image tones

========================
LAYOUT STRUCTURE (MANDATORY)
========================

1. LOGO (Top Left)
- "{{brand_name}}" logo
- Small but clearly visible
- White or light version
- Maintain proper spacing from edges

2. MAIN TITLE (HERO TEXT)
- Large, bold handwritten/script font
- "{{headline}}"
- Center aligned
- White or off-white color
- Subtle shadow for readability
- Most dominant visual element

3. PRICING SECTION (Center)
- Small label: "Fees-" or "Starting From"
- Large bold value: "{{price}}"
- Price significantly larger than label
- Clean sans-serif font, center aligned

4. INCLUDES SECTION
- Accent-colored label: "Includes"
- Content: "{{includes}}"
- Bold sans-serif, pipe-separated
- Center aligned, compact

5. FOOTER (Bottom — horizontal pill layout)
- "{{dates}}"
- "{{contact}}"
- Arranged as horizontal pill/box segments
- Small but readable sans-serif
- Bottom center alignment

========================
BACKGROUND RULES (CRITICAL)
========================
- Use original image ONLY
- DO NOT apply heavy color grading
- Allowed: slight contrast boost, subtle dark gradient for text readability

========================
COLOR SYSTEM
========================
- Primary text: White or off-white
- Accent: Yellow/orange for "Includes" label only
- Natural tones from image
- Avoid neon or oversaturated colors

========================
TYPOGRAPHY RULES
========================
- Maximum 2 fonts:
  1. Script/display → Title
  2. Sans-serif → All other content
- Hierarchy: Title > Price > Includes > Details

========================
COMPOSITION RULES
========================
- Instagram 4:5 (portrait)
- Centered layout with vertical stacking
- Breathing space between elements
- Optimized for mobile readability

========================
STRICTLY AVOID
========================
- Over-minimal or luxury style
- Too many fonts
- Heavy filters or unnatural edits
- Cluttered compositions
- Low contrast text

========================
OUTPUT
========================
Generate a bold, clean, adventure-style trek poster with:
- Strong script headline
- Clear pricing and includes hierarchy
- Pill-style footer with date + contact
- {{brand_name}} branding
- Universal adaptability across all outdoor images`,
			dynamic_fields: ['destination', 'headline', 'price', 'includes', 'dates', 'contact', 'brand_name'],
		},
		sort_order: 3,
	},

	// ─── 4. Heritage Cinematic (HTML) ──────────────────────────────────
	{
		name: 'Heritage Cinematic',
		slug: 'heritage-cinematic',
		renderer: 'html' as const,
		description: 'Cinematic cultural poster with calligraphy headline, serif title, split bottom layout, timeless elegance',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior brand designer specializing in heritage, cultural, and cinematic travel posters for premium tourism campaigns.

Your task is to transform ANY destination image into a timeless, premium heritage-style travel poster for "{{brand_name}}".

The output must follow a STRICT reusable layout system and must work consistently across ALL types of images (temples, cities, beaches, mountains, architecture) WITHOUT heavy color grading or artificial filters.

========================
PRIMARY OBJECTIVE
========================
Create a cinematic, cultural, and premium travel poster that:
- Feels timeless and editorial (museum-quality aesthetic)
- Maintains high readability on any background
- Uses structured typography hierarchy
- Preserves natural image tones (no heavy edits)
- Works as a reusable design system

========================
LAYOUT STRUCTURE (MANDATORY)
========================

1. ARTISTIC HEADLINE (Top Section)
- Large expressive script or calligraphy-style font
- "{{headline}}"
- Slightly overlaps sky or open background area
- Color: soft cream or off-white
- Must feel elegant, artistic, and cultural (NOT playful)

2. MAIN TITLE (Center)
- Large serif font (cinematic, authoritative)
- "{{subheadline}}"
- ALL CAPS with good letter spacing
- Strong visual anchor of the design
- Center aligned

3. SUBTITLE (Below Title)
- Smaller serif font
- "{{tagline}}"
- Use subtle bullet separators
- Optional thin divider line or ornament for premium feel

4. BACKGROUND HANDLING (CRITICAL)
- Use original image ONLY
- DO NOT apply heavy color grading or filters
- DO NOT alter natural tones
- Allowed: slight contrast enhancement, very subtle vignette or bottom gradient for readability

5. INFORMATION SECTION (Bottom Left)
- Title: "Includes:"
- Content: "{{includes}}"
- Use clean sans-serif font
- Medium-small size

6. DETAILS SECTION (Bottom Right)
- "{{duration}}"
- "STARTING FROM {{price}}"
- Serif or sans-serif, balanced alignment

7. BRANDING (Bottom Center)
- "{{brand_name}}"
- Tagline: "by your side"
- Minimal, elegant, non-dominant

========================
TYPOGRAPHY RULES
========================
- Use MAXIMUM 3 font types:
  1. Script / Calligraphy → Artistic headline
  2. Serif → Main title & subtitle
  3. Sans-serif → Information sections
- Maintain clear hierarchy, consistent spacing, premium editorial feel

========================
COLOR SYSTEM
========================
- Primary text: Cream / off-white
- Optional accent: very subtle gold (minimal)
- Use natural tones from image
- Avoid neon, oversaturation, harsh contrasts

========================
COMPOSITION RULES
========================
- Format: Instagram 4:5 (portrait)
- Centered layout with strong vertical flow
- Use negative space intelligently
- Ensure mobile readability

========================
SMART ADAPTATION
========================
- If background is bright → slightly deepen text contrast
- If background is dark → slightly soften text brightness
- If background is busy → increase spacing instead of overlays

========================
OUTPUT
========================
Generate a premium, cinematic, heritage-style travel poster with:
- Calligraphy headline
- Structured serif typography
- Split bottom layout (includes left, price right)
- {{brand_name}} branding with tagline
- Universal adaptability across all images`,
			dynamic_fields: ['destination', 'headline', 'subheadline', 'tagline', 'includes', 'duration', 'price', 'brand_name'],
		},
		sort_order: 4,
	},

	// ─── 5. Brush Script Escape (HTML) ─────────────────────────────────
	{
		name: 'Brush Script Escape',
		slug: 'brush-script-escape',
		renderer: 'html' as const,
		description: 'Bold brush/script hero text, structured info blocks, adventure-clean style with strict reusable layout',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: `You are a senior travel marketing designer and performance creative expert specializing in high-converting Instagram travel posters (2025–2026 trends).

Your task is to transform ANY destination image into a bold, clean, adventure-style promotional poster for a travel brand called "{{brand_name}}".

The design must follow a STRICT reusable layout system and must work consistently across all types of images (beach, city, mountains, temples, etc.) WITHOUT heavy color grading.

========================
PRIMARY OBJECTIVE
========================
Create a visually striking, high-conversion Instagram poster that:
- Maintains strong readability on any background
- Uses a consistent brand layout
- Feels premium, youthful, and modern
- Avoids heavy edits so it works on any image

========================
LAYOUT STRUCTURE (MANDATORY)
========================

1. LOGO (Top Center)
- Use "{{brand_name}}" logo
- Small, clean, premium look
- White or adaptive light tone
- Maintain proper top spacing
- Do NOT distort or stylize the logo

2. MAIN HEADLINE (Hero Text)
- Large brush/script handwritten style font
- "{{headline}}"
- Center aligned
- White or off-white color
- Add very subtle shadow or glow ONLY for readability
- This must be the most dominant visual element

3. PRICING SECTION (Center)
- Small label: "Starting From"
- Large bold price: "{{price}}"
- Clear hierarchy (price much larger than label)
- Use clean sans-serif font (Montserrat or Poppins)
- Center aligned under headline

4. INCLUDES SECTION
- Title: "Includes"
- Content: "{{includes}}"
- Clean sans-serif font
- Medium size, easy to scan
- Balanced spacing

5. FOOTER (Bottom Section)
- "{{dates}}"
- "{{contact}}"
- Layout: horizontal or stacked depending on space
- Small but readable sans-serif font
- Bottom center alignment

========================
BACKGROUND RULES (CRITICAL)
========================
- Use the original image as-is
- DO NOT apply heavy color grading or filters
- DO NOT change natural tones

Allowed adjustments:
- Slight contrast improvement (only if needed)
- Very subtle bottom gradient (black to transparent, low opacity) ONLY for text readability

The design must work universally on ANY image.

========================
COLOR SYSTEM
========================
- Primary text: White or off-white
- Optional accent: very minimal yellow/orange
- Must adapt to background automatically
- Avoid bright, neon, or oversaturated colors

========================
TYPOGRAPHY RULES
========================
- Use ONLY 2 fonts:
  1. Brush/Script font for headline (like "Playlist Script", "Brush Script", "Pacifico")
  2. Clean sans-serif for all other text (Montserrat or Poppins)
- Maintain strong hierarchy and spacing
- Keep everything clean and readable

========================
COMPOSITION RULES
========================
- Instagram format: 4:5 (portrait)
- Centered layout with strong vertical flow
- Maintain breathing space between elements
- Optimize for mobile readability

========================
STRICTLY AVOID
========================
- Overcrowded layouts
- Too many fonts
- Heavy filters or unnatural edits
- Cheap flyer-style designs
- Low contrast text
- Random or unstructured placement

========================
SMART ADAPTATION
========================
- If background is bright → slightly enhance text contrast
- If background is dark → slightly brighten text tone
- If background is busy → increase spacing instead of adding overlays

========================
OUTPUT
========================
Generate a bold, clean, premium Instagram travel poster with:
- Strong brush-script headline
- Structured layout
- High readability
- Consistent {{brand_name}} branding
- Universal adaptability across all images`,
			dynamic_fields: ['destination', 'headline', 'price', 'includes', 'dates', 'contact', 'brand_name'],
		},
		sort_order: 5,
	},

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// PYTHON + PILLOW TEMPLATES (Advanced image compositing)
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	// ─── 6. Promo Collage (Python) ─────────────────────────────
	{
		name: 'Promo Collage',
		slug: 'promo-collage',
		renderer: 'python' as const,
		description: 'Promotional offer banner with polaroid-style photo collage, coupon badge, gradient or striped background. Ideal for discount campaigns.',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: 'Python/Pillow template: promotional banner with coupon code badge and polaroid photo collage. Supports gradient, striped, or image backgrounds.',
			dynamic_fields: ['headline', 'subheadline', 'coupon_code', 'coupon_label', 'photos', 'accent_color', 'bg_type'],
		},
		sort_order: 6,
	},

	// ─── 7. Hotel Feature (Python) ─────────────────────────────
	{
		name: 'Hotel Feature',
		slug: 'hotel-feature',
		renderer: 'python' as const,
		description: 'Full-bleed background image with large headline, coupon badge, and bottom feature bar with icon columns. Great for hotel/stay offers.',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: 'Python/Pillow template: full-bleed background with gradient overlay, multi-line headline, coupon badge, and bottom feature bar with USP columns.',
			dynamic_fields: ['pre_headline', 'headline', 'subheadline', 'coupon_code', 'accent_color', 'features'],
		},
		sort_order: 7,
	},

	// ─── 8. Phone Mockup (Python) ──────────────────────────────
	{
		name: 'Phone Mockup',
		slug: 'phone-mockup',
		renderer: 'python' as const,
		description: 'Scenic background with a phone mockup showing a travel image, bold headline, and accent bars. Perfect for re-engagement and app promotion.',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: 'Python/Pillow template: scenic background with phone device mockup, bold headline, subheadline, and colored accent bars.',
			dynamic_fields: ['headline', 'subheadline', 'phone_image', 'accent_bars'],
		},
		sort_order: 8,
	},

	// ─── 9. Photo Board (Python) ───────────────────────────────
	{
		name: 'Photo Board',
		slug: 'photo-board',
		renderer: 'python' as const,
		description: 'Textured background (wood planks or stripes) with scattered polaroid photos, offer headline, and coupon badge. Magazine-style layout.',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: 'Python/Pillow template: wood or striped texture background with scattered polaroid-framed photos, offer headline, accent bars, and coupon badge.',
			dynamic_fields: ['headline', 'subheadline', 'coupon_code', 'photos', 'accent_color', 'bg_texture'],
		},
		sort_order: 9,
	},

	// ─── 10. Minimal CTA (Python) ──────────────────────────────
	{
		name: 'Minimal CTA',
		slug: 'minimal-cta',
		renderer: 'python' as const,
		description: 'Clean full-bleed background with vignette, large headline, CTA button, and optional coupon badge. Versatile for any promotion.',
		media_type: 'image' as const,
		prompt_config: {
			design_prompt: 'Python/Pillow template: full-bleed image with vignette and gradient overlay, large bold headline, rounded CTA button, and optional coupon badge.',
			dynamic_fields: ['headline', 'subheadline', 'cta_text', 'coupon_code', 'accent_color', 'headline_position'],
		},
		sort_order: 10,
	},
]

/**
 * Smart seed: upserts by slug.
 * - Missing templates → inserted
 * - Existing templates → renderer field updated (fixes html→python)
 * - Safe to run on every server start
 */
export const seedDesignTemplates = async (): Promise<void> => {
	try {
		let inserted = 0
		let updated = 0

		for (const tmpl of DESIGN_TEMPLATES) {
			const existing = await DesignTemplate.findOne({ where: { slug: tmpl.slug } })

			if (!existing) {
				await DesignTemplate.create(tmpl as any)
				inserted++
			} else if (existing.renderer !== tmpl.renderer) {
				await existing.update({ renderer: tmpl.renderer })
				updated++
			}
		}

		if (inserted > 0 || updated > 0) {
			logger.info(`[Seed] Design templates: ${inserted} inserted, ${updated} updated`)
		} else {
			logger.info(`[Seed] Design templates: all ${DESIGN_TEMPLATES.length} up to date`)
		}
	} catch (error) {
		logger.error('[Seed] Failed to seed design templates:', error)
	}
}

export const reseedDesignTemplates = async (): Promise<void> => {
	try {
		await DesignTemplate.destroy({ where: {}, force: true })
		logger.info('[Seed] Cleared existing design templates')

		await DesignTemplate.bulkCreate(DESIGN_TEMPLATES as any[])
		logger.info(`[Seed] Re-seeded ${DESIGN_TEMPLATES.length} design templates`)
	} catch (error) {
		logger.error('[Seed] Failed to re-seed design templates:', error)
	}
}
