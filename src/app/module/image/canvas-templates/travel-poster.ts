/**
 * Template: Travel Poster
 * =======================
 * Full-bleed destination photo with large script headline, boarding pass ticket,
 * feature icons row, trip duration badge, contact bar, and brand elements.
 *
 * Reference: Thailand travel poster (FlyRoots Holidays style).
 *
 * Config keys:
 *   destination      – "Thailand"
 *   headline         – Same as destination (rendered in large script)
 *   bgImagePath      – Background photo (full-bleed)
 *   logoPath          – Brand logo
 *   website           – "www.flyroots.com"
 *   email             – "official@flyroots.com"
 *   emiAvailable      – true/false
 *   nights            – 5
 *   days              – 4
 *   boardingPass      – { destination, date, flightCode }
 *   features          – [{ icon, label }]  (Airfare, Hotel, Transport, etc.)
 *   contacts          – [{ city, phone }]
 *   brandName         – "FLYROOTS HOLIDAYS"
 *   accentColor       – primary accent (default: '#EA580C')
 */
import { loadImage } from '@napi-rs/canvas'
import {
	createTemplateCanvas,
	INSTAGRAM,
	preset,
	px,
	type Dimensions,
} from '../canvas-engine/core'
import { TextRenderer } from '../canvas-engine/text'
import { Effects } from '../canvas-engine/effects'
import { Components, type BoardingPassConfig } from '../canvas-engine/components'

// ── Types ──────────────────────────────────────────────────────────

export interface TravelPosterConfig {
	destination: string
	headline?: string
	bgImagePath?: string
	logoPath?: string
	website?: string
	email?: string
	emiAvailable?: boolean
	nights?: number
	days?: number
	boardingPass?: BoardingPassConfig
	features?: Array<{ icon: string; label: string }>
	contacts?: Array<{ city: string; phone: string }>
	brandName?: string
	accentColor?: string
}

// ── Default Config ─────────────────────────────────────────────────

const DEFAULT_FEATURES = [
	{ icon: '\u2708', label: 'Airfare' },
	{ icon: '\u2302', label: 'Delux\nHotel' },
	{ icon: '\u2693', label: 'Local\nTransport' },
	{ icon: '\u2609', label: 'Sightseeing' },
	{ icon: '\u2615', label: 'Breakfast' },
]

// ── Render Function ────────────────────────────────────────────────

export async function renderTravelPoster(
	config: TravelPosterConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width
	const H = dims.height
	const { canvas, ctx } = createTemplateCanvas(dims)

	const destination = config.destination || 'Thailand'
	const headline = config.headline || destination
	const accentColor = config.accentColor || '#EA580C'

	// ── 1. Background Image ───────────────────────────────────────
	if (config.bgImagePath) {
		try {
			const img = await loadImage(config.bgImagePath)
			// Cover crop: fill canvas maintaining aspect ratio
			const imgRatio = img.width / img.height
			const canvasRatio = W / H
			let sx = 0, sy = 0, sw = img.width, sh = img.height

			if (imgRatio > canvasRatio) {
				// Image is wider → crop sides
				sw = Math.round(img.height * canvasRatio)
				sx = Math.round((img.width - sw) / 2)
			} else {
				// Image is taller → crop top/bottom
				sh = Math.round(img.width / canvasRatio)
				sy = Math.round((img.height - sh) / 2)
			}
			ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
		} catch {
			// Fallback: dark blue gradient
			Effects.linearGradient(ctx, 0, 0, W, H, [
				{ stop: 0, color: '#1a1a2e' },
				{ stop: 0.5, color: '#16213e' },
				{ stop: 1, color: '#0f3460' },
			])
		}
	} else {
		// No image: sunset-style gradient
		Effects.linearGradient(ctx, 0, 0, W, H, [
			{ stop: 0, color: '#E8734A' },
			{ stop: 0.35, color: '#D4654A' },
			{ stop: 0.65, color: '#4A6FA5' },
			{ stop: 1, color: '#1B3A6B' },
		])
	}

	// ── 2. Gradient Overlays for text readability ──────────────────
	Effects.multiGradientOverlay(ctx, W, H, [
		// Top: subtle darkening for website/email bar
		{ direction: 'top_down', startColor: 'rgba(0,0,0,0.3)', endColor: 'rgba(0,0,0,0)', coverage: 0.15 },
		// Bottom: strong darkening for features/contact area
		{ direction: 'bottom_up', startColor: 'rgba(0,0,0,0.75)', endColor: 'rgba(0,0,0,0)', coverage: 0.45 },
	])

	// ── 3. Top Bar: Website + Email ───────────────────────────────
	Components.drawTopBar(
		ctx,
		px(0.04, W), px(0.025, H),
		W * 0.92,
		config.website || 'www.raynatours.com',
		config.email || 'info@raynatours.com',
		14,
	)

	// ── 4. EMI Badge (top-right) ──────────────────────────────────
	if (config.emiAvailable !== false) {
		Components.drawEmiBadge(
			ctx,
			W - px(0.04, W) - 110, px(0.055, H),
			110, 60,
		)
	}

	// ── 5. Destination Headline (large script font) ───────────────
	{
		const headlineY = px(0.18, H)
		const maxW = W * 0.85

		// Auto-fit to width
		const { font, size } = TextRenderer.fitFontSize(
			ctx, headline, 'playlist', maxW,
			160, 70,
		)

		// Draw with shadow
		TextRenderer.draw(ctx, W * 0.08, headlineY, headline, {
			font,
			color: '#FFFFFF',
			align: 'left',
			baseline: 'top',
			shadow: { offsetX: 3, offsetY: 4, blur: 12, color: 'rgba(0,0,0,0.6)' },
		})
	}

	// ── 6. Boarding Pass Ticket (right side, rotated) ──────────────
	if (config.boardingPass) {
		const ticketW = px(0.34, W)
		const ticketH = px(0.26, H)
		const ticketX = W - ticketW - px(0.04, W)
		const ticketY = px(0.27, H)

		Components.drawBoardingPass(ctx, ticketX, ticketY, ticketW, ticketH, {
			destination: config.boardingPass.destination || destination.toUpperCase(),
			date: config.boardingPass.date || 'MAR 25',
			flightCode: config.boardingPass.flightCode || 'RAYNA0001',
			rotation: config.boardingPass.rotation ?? 10,
		})
	}

	// ── 7. Trip Duration (5N|4D) with icons ───────────────────────
	{
		const durationY = px(0.66, H)
		Components.drawTripDuration(
			ctx,
			px(0.05, W), durationY,
			config.nights || 5,
			config.days || 4,
			36,
		)
	}

	// ── 8. Feature Icons Row ──────────────────────────────────────
	{
		const features = config.features || DEFAULT_FEATURES
		const featureY = px(0.73, H)

		Components.drawFeatureRow(
			ctx,
			px(0.02, W), featureY,
			W * 0.96,
			features,
			{ iconSize: 22, labelSize: 12, circleRadius: 20 },
		)
	}

	// ── 9. Brand Logo (bottom-left) ───────────────────────────────
	{
		const brandY = px(0.86, H)

		if (config.logoPath) {
			await Components.placeLogo(
				ctx, config.logoPath,
				px(0.04, W), brandY,
				px(0.30, W), px(0.06, H),
			)
		} else {
			// Text fallback for brand name
			const brandName = config.brandName || 'RAYNA TOURS'
			ctx.save()
			ctx.font = preset('montserrat-bold', 22)
			ctx.textAlign = 'left'
			ctx.textBaseline = 'top'
			ctx.fillStyle = '#FFFFFF'
			ctx.shadowColor = 'rgba(0,0,0,0.4)'
			ctx.shadowBlur = 4
			ctx.fillText(brandName, px(0.04, W), brandY)

			// "HOLIDAYS" subtitle
			ctx.font = preset('montserrat', 14)
			ctx.fillStyle = 'rgba(255,255,255,0.7)'
			ctx.fillText('H O L I D A Y S', px(0.04, W), brandY + 28)
			ctx.restore()
		}
	}

	// ── 10. Contact Bar (bottom-right) ────────────────────────────
	{
		const contacts = config.contacts || [
			{ city: 'Dubai', phone: '04-2345678' },
			{ city: 'Abu Dhabi', phone: '02-3456789' },
		]
		const contactY = px(0.88, H)
		const contactX = px(0.38, W)
		const contactW = W - contactX - px(0.02, W)

		Components.drawContactBar(ctx, contactX, contactY, contactW, contacts, 14)
	}

	// ── 11. T&C text (very bottom) ────────────────────────────────
	{
		ctx.save()
		ctx.font = preset('montserrat', 11)
		ctx.textAlign = 'center'
		ctx.textBaseline = 'bottom'
		ctx.fillStyle = 'rgba(255,255,255,0.4)'
		ctx.fillText('*T&C apply. Prices subject to availability.', W / 2, H - px(0.015, H))
		ctx.restore()
	}

	// ── Export ─────────────────────────────────────────────────────
	return canvas.encode('png')
}
