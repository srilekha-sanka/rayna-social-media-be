/**
 * Template: Tour and Travel
 * =========================
 * Teal gradient background with large serif headline, subtitle,
 * two overlapping photo frames with paperclip decorations,
 * airplane silhouettes, bottom CTA bar with website + button + phone.
 *
 * Reference: WTL Tourism "Tour and Travel" poster.
 *
 * Config keys:
 *   brandName         – "Worldtriplink" (or your brand)
 *   headline          – "Tour and Travel"
 *   subtitle          – "Book your next journey now and explore..."
 *   photos            – [path1, path2] (two photos for the collage)
 *   logoPath          – brand logo
 *   website           – "www.raynatours.com/"
 *   phone             – "9730545491"
 *   ctaText           – "BOOK NOW"
 *   accentColor       – teal/turquoise accent (default: '#0891B2')
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
import { Components } from '../canvas-engine/components'

// ── Types ──────────────────────────────────────────────────────────

export interface TourTravelConfig {
	brandName?: string
	headline?: string
	subtitle?: string
	photos?: string[]          // paths to 2 photos
	logoPath?: string
	website?: string
	phone?: string
	ctaText?: string
	accentColor?: string
}

// ── Render Function ────────────────────────────────────────────────

export async function renderTourTravel(
	config: TourTravelConfig,
	dims: Dimensions = INSTAGRAM['1:1'],
): Promise<Buffer> {
	const W = dims.width
	const H = dims.height
	const { canvas, ctx } = createTemplateCanvas(dims)

	const brandName = config.brandName || 'Rayna Tours'
	const headline = config.headline || 'Tour and Travel'
	const subtitle = config.subtitle || 'Book your next journey now and explore with comfort,\nsafety, and expert guidance'
	const ctaText = config.ctaText || 'BOOK NOW'
	const website = config.website || 'www.raynatours.com/'
	const phone = config.phone || '+971 4 268 7444'
	const accentColor = config.accentColor || '#0891B2'

	// ── 1. Background: Teal Gradient ──────────────────────────────
	Effects.linearGradient(ctx, 0, 0, W, H, [
		{ stop: 0, color: '#45B5AA' },
		{ stop: 0.3, color: '#2DA09B' },
		{ stop: 0.6, color: '#1A8A8A' },
		{ stop: 1, color: '#0E7070' },
	])

	// Subtle noise/texture overlay — slight darkening at edges
	Effects.gradientOverlay(ctx, W, H, {
		direction: 'left_right',
		startColor: 'rgba(0,0,0,0.08)',
		endColor: 'rgba(0,0,0,0)',
		coverage: 0.3,
	})
	Effects.gradientOverlay(ctx, W, H, {
		direction: 'bottom_up',
		startColor: 'rgba(0,0,0,0.12)',
		endColor: 'rgba(0,0,0,0)',
		coverage: 0.2,
	})

	// ── 2. Decorative Airplane Silhouettes ────────────────────────
	Effects.airplaneIcon(ctx, W * 0.78, H * 0.06, 80, 'rgba(255,255,255,0.10)', -35)
	Effects.airplaneIcon(ctx, W * 0.88, H * 0.12, 50, 'rgba(255,255,255,0.07)', 25)
	Effects.airplaneIcon(ctx, W * 0.15, H * 0.55, 60, 'rgba(255,255,255,0.06)', -50)

	// ── 3. Logo (top-left) ────────────────────────────────────────
	if (config.logoPath) {
		await Components.placeLogo(
			ctx, config.logoPath,
			px(0.04, W), px(0.03, H),
			px(0.18, W), px(0.06, H),
		)
	} else {
		// Text fallback
		ctx.save()
		ctx.font = preset('montserrat-bold', 20)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#FFFFFF'
		ctx.shadowColor = 'rgba(0,0,0,0.3)'
		ctx.shadowBlur = 3
		ctx.fillText(brandName.toUpperCase(), px(0.05, W), px(0.035, H))
		ctx.font = preset('montserrat', 12)
		ctx.fillStyle = 'rgba(255,255,255,0.7)'
		ctx.fillText('TOURISM. PVT. LTD', px(0.05, W), px(0.035, H) + 25)
		ctx.restore()
	}

	// ── 4. Brand Name (centered above headline) ───────────────────
	{
		const nameY = px(0.12, H)
		ctx.save()
		ctx.font = preset('montserrat-semibold', 20)
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#1A3636'
		ctx.fillText(brandName, W / 2, nameY)
		ctx.restore()
	}

	// ── 5. Headline: "Tour and Travel" (large decorative font) ────
	{
		const headlineY = px(0.16, H)
		const maxW = W * 0.90

		const { font } = TextRenderer.fitFontSize(
			ctx, headline, 'playlist', maxW,
			130, 50,
		)

		TextRenderer.draw(ctx, W / 2, headlineY, headline, {
			font,
			color: '#1A2E2E',
			align: 'center',
			baseline: 'top',
			shadow: { offsetX: 1, offsetY: 2, blur: 3, color: 'rgba(0,0,0,0.15)' },
		})
	}

	// ── 6. Subtitle ───────────────────────────────────────────────
	{
		const subY = px(0.28, H)
		const font = preset('montserrat-semibold', 16)

		TextRenderer.drawMultiline(ctx, W / 2, subY, subtitle, {
			font,
			color: '#1A3636',
			align: 'center',
			baseline: 'top',
			lineSpacing: 6,
		})
	}

	// ── 7. Photo Frames (two overlapping, with paperclips) ────────
	{
		const frameW = px(0.40, W)
		const frameH = px(0.36, H)

		// Left photo: rotated slightly counter-clockwise
		Effects.photoFrame(ctx, px(0.04, W), px(0.35, H), frameW, frameH, {
			rotation: -5,
			borderWidth: 10,
			shadow: { color: 'rgba(0,0,0,0.25)', blur: 15, offsetX: 3, offsetY: 6 },
			paperclipSide: 'top-left',
			paperclipColor: '#2C3E50',
		})

		// Load and draw left photo if available
		if (config.photos?.[0]) {
			try {
				const photo1 = await loadImage(config.photos[0])
				ctx.save()
				const cx1 = px(0.04, W) + (frameW + 20) / 2
				const cy1 = px(0.35, H) + (frameH + 20) / 2
				ctx.translate(cx1, cy1)
				ctx.rotate(-5 * Math.PI / 180)

				// Clip to frame area
				ctx.beginPath()
				ctx.rect(-frameW / 2, -frameH / 2, frameW, frameH)
				ctx.clip()

				// Cover crop
				const imgRatio = photo1.width / photo1.height
				const frameRatio = frameW / frameH
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = frameH
					dw = frameH * imgRatio
				} else {
					dw = frameW
					dh = frameW / imgRatio
				}
				ctx.drawImage(photo1, -dw / 2, -dh / 2, dw, dh)
				ctx.restore()
			} catch { /* skip */ }
		}

		// Right photo: rotated slightly clockwise, overlapping
		Effects.photoFrame(ctx, px(0.42, W), px(0.37, H), frameW, frameH, {
			rotation: 4,
			borderWidth: 10,
			shadow: { color: 'rgba(0,0,0,0.25)', blur: 15, offsetX: 3, offsetY: 6 },
			paperclipSide: 'top-right',
			paperclipColor: '#2C3E50',
		})

		// Load and draw right photo if available
		if (config.photos?.[1]) {
			try {
				const photo2 = await loadImage(config.photos[1])
				ctx.save()
				const cx2 = px(0.42, W) + (frameW + 20) / 2
				const cy2 = px(0.37, H) + (frameH + 20) / 2
				ctx.translate(cx2, cy2)
				ctx.rotate(4 * Math.PI / 180)

				ctx.beginPath()
				ctx.rect(-frameW / 2, -frameH / 2, frameW, frameH)
				ctx.clip()

				const imgRatio = photo2.width / photo2.height
				const frameRatio = frameW / frameH
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = frameH
					dw = frameH * imgRatio
				} else {
					dw = frameW
					dh = frameW / imgRatio
				}
				ctx.drawImage(photo2, -dw / 2, -dh / 2, dw, dh)
				ctx.restore()
			} catch { /* skip */ }
		}
	}

	// ── 8. Bottom Bar: white/light strip ──────────────────────────
	{
		const barH = px(0.10, H)
		const barY = H - barH

		// Semi-transparent white bar
		ctx.save()
		ctx.fillStyle = 'rgba(255,255,255,0.15)'
		ctx.fillRect(0, barY, W, barH)
		ctx.restore()

		// Divider line
		ctx.save()
		ctx.strokeStyle = 'rgba(255,255,255,0.3)'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(px(0.04, W), barY)
		ctx.lineTo(W - px(0.04, W), barY)
		ctx.stroke()
		ctx.restore()

		const barCenterY = barY + barH / 2

		// Website (left)
		ctx.save()
		ctx.font = preset('montserrat-semibold', 17)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = '#FFFFFF'
		ctx.fillText(website, px(0.05, W), barCenterY)
		ctx.restore()

		// CTA Button (center)
		Components.drawCTAButton(ctx, W / 2, barCenterY - 22, ctaText, {
			bgColor: 'transparent',
			textColor: accentColor,
			fontSize: 18,
			paddingX: 28,
			height: 44,
			radius: 8,
		})
		// Draw border for transparent button
		ctx.save()
		Effects.roundedRectPath(ctx, W / 2 - 75, barCenterY - 22, 150, 44, 8)
		ctx.strokeStyle = accentColor
		ctx.lineWidth = 2
		ctx.stroke()
		ctx.restore()

		// Phone (right)
		ctx.save()
		ctx.font = preset('montserrat-bold', 20)
		ctx.textAlign = 'right'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = '#1A3636'
		ctx.fillText(phone, W - px(0.05, W), barCenterY)
		ctx.restore()
	}

	// ── Export ─────────────────────────────────────────────────────
	return canvas.encode('png')
}
