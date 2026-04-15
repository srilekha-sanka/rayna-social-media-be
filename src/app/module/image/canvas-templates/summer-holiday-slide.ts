/**
 * Template: Summer Holiday Slide (Carousel Item)
 * ================================================
 * White background with logo + badge header, Fuzzy Bubbles title
 * & subtitle, a large centered photo card with gradient overlay
 * and label text, and bird silhouette decorations.
 *
 * Paired with the `summer-holiday` cover template.
 *
 * Reference: Figma node 340:4535 — "Instagram post - 26" (1080×1350)
 *
 * Config keys:
 *   title       – Category heading (e.g., "Activities", "Cruises")
 *   subtitle    – Offer text (e.g., "Book at 20% Off")
 *   photo       – Single photo path for the card
 *   photoLabel  – Label on the photo (e.g., "Kayaking")
 *   logoPath    – Brand logo path
 *   website     – "www.raynatours.com"
 *   phone       – "011-348885"
 *   titleColor  – Heading text color (default: '#596d89')
 */
import { loadImage } from '@napi-rs/canvas'
import path from 'path'
import fs from 'fs'
import {
	createTemplateCanvas,
	INSTAGRAM,
	preset,
	fontString,
	type Dimensions,
	type SKRSContext2D,
} from '../canvas-engine/core'
import { TextRenderer } from '../canvas-engine/text'
import { Effects } from '../canvas-engine/effects'
import { Components } from '../canvas-engine/components'

// ── Asset Paths ───────────────────────────────────────────────
const ASSETS_DIR = path.resolve(__dirname, '../../../../../assets/images')
const BIRDS_PNG = path.join(ASSETS_DIR, 'birds.png')

// ── Config ────────────────────────────────────────────────────

export interface SummerHolidaySlideConfig {
	title?: string          // "Activities", "Cruises", etc.
	subtitle?: string       // "Book at 20% Off"
	photo?: string          // single photo path
	photoLabel?: string     // label on the photo card (e.g., "Kayaking")
	logoPath?: string
	website?: string
	phone?: string
	titleColor?: string     // default: '#596d89'
}

// ── PNG Helpers ───────────────────────────────────────────────

async function drawRotatedPNG(
	ctx: SKRSContext2D, filePath: string,
	cx: number, cy: number, w: number, h: number,
	rotation: number, opacity: number = 1,
): Promise<void> {
	try {
		const buf = fs.readFileSync(filePath)
		const img = await loadImage(buf)
		ctx.save()
		ctx.globalAlpha = opacity
		ctx.translate(cx, cy)
		ctx.rotate(rotation * Math.PI / 180)
		ctx.drawImage(img, -w / 2, -h / 2, w, h)
		ctx.restore()
	} catch { /* skip */ }
}

// ── Render Function ───────────────────────────────────────────

export async function renderSummerHolidaySlide(
	config: SummerHolidaySlideConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width    // 1080
	const H = dims.height   // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const title = config.title || 'Activities'
	const subtitle = config.subtitle || 'Book at 20% Off'
	const photoLabel = config.photoLabel || ''
	const website = config.website || 'www.raynatours.com'
	const phone = config.phone || '011-348885'
	const titleColor = config.titleColor || '#596d89'

	// ═══════════════════════════════════════════════════════════
	// 1. White background
	// ═══════════════════════════════════════════════════════════
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Header row (340:4540)
	//    Figma: left:40, top:40, w:1000
	//    Logo left, badges right
	// ═══════════════════════════════════════════════════════════

	// ── 2a. Logo (left) — Figma: h:72, w:194 ──
	if (config.logoPath) {
		await Components.placeLogo(ctx, config.logoPath, 40, 40, 194, 72)
	} else {
		ctx.save()
		ctx.font = preset('playlist', 42)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#C0392B'
		ctx.fillText('Rayna', 40, 40)
		const rw = ctx.measureText('Rayna').width
		ctx.font = preset('montserrat', 11)
		ctx.fillStyle = '#888888'
		ctx.fillText('tours', 40 + rw + 4, 66)
		ctx.restore()
	}

	// ── 2b. Badge helper ──
	const drawBadge = (
		bx: number, by: number,
		iconType: 'phone' | 'globe',
		text: string,
	) => {
		const badgeFont = preset('dm-sans', 20)
		const { width: tw } = TextRenderer.measure(ctx, text, badgeFont)
		const iconSz = 22
		const padX = 24, padY = 16, gap = 11
		const bw = padX + iconSz + gap + tw + padX
		const bh = 54

		// Border + background
		ctx.save()
		Effects.roundedRectPath(ctx, bx, by, bw, bh, 12)
		ctx.fillStyle = '#ffffff'
		ctx.fill()
		ctx.strokeStyle = '#7e7e7e'
		ctx.lineWidth = 1
		ctx.stroke()
		ctx.restore()

		// Icon
		const iconCX = bx + padX + iconSz / 2
		const iconCY = by + bh / 2
		const iconR = iconSz / 2

		if (iconType === 'globe') {
			ctx.save()
			ctx.strokeStyle = '#444'
			ctx.lineWidth = 2
			ctx.beginPath(); ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2); ctx.stroke()
			ctx.beginPath(); ctx.moveTo(iconCX - iconR, iconCY); ctx.lineTo(iconCX + iconR, iconCY); ctx.stroke()
			ctx.beginPath(); ctx.moveTo(iconCX, iconCY - iconR); ctx.lineTo(iconCX, iconCY + iconR); ctx.stroke()
			ctx.restore()
		} else {
			// Phone icon (simple handset shape)
			ctx.save()
			ctx.fillStyle = '#25D366'
			ctx.beginPath()
			ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2)
			ctx.fill()
			// White phone symbol
			ctx.fillStyle = '#ffffff'
			ctx.font = `bold ${iconSz * 0.6}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText('\u260E', iconCX, iconCY)
			ctx.restore()
		}

		// Text
		TextRenderer.draw(ctx, bx + padX + iconSz + gap, by + padY, text, {
			font: badgeFont, color: '#000000', align: 'left', baseline: 'top',
		})

		return bw
	}

	// ── 2c. Badges (right-aligned from left:1040) ──
	//    Figma: phone badge + web badge, gap:16
	{
		// Measure web badge width first to position from right
		const webFont = preset('dm-sans', 20)
		const { width: webTW } = TextRenderer.measure(ctx, website, webFont)
		const webBW = 24 + 22 + 11 + webTW + 24

		const { width: phoneTW } = TextRenderer.measure(ctx, phone, webFont)
		const phoneBW = 24 + 22 + 11 + phoneTW + 24

		const rightEdge = 1040
		const badgeGap = 16
		const webX = rightEdge - webBW
		const phoneX = webX - badgeGap - phoneBW
		const badgeY = 40

		drawBadge(phoneX, badgeY, 'phone', phone)
		drawBadge(webX, badgeY, 'globe', website)
	}

	// ═══════════════════════════════════════════════════════════
	// 3. Title + subtitle text block (340:4569)
	//    Figma: left:212, top:243, w:657, centered
	//    "Activities": Fuzzy Bubbles Bold 64px, #596d89
	//    "Book at 20% Off": Fuzzy Bubbles Regular 32px, #596d89
	// ═══════════════════════════════════════════════════════════
	{
		const blockCX = 212 + 657 / 2  // center of the text block = 540.5
		const blockTop = 243

		// Title
		const titleFont = fontString('fuzzy-bubbles-bold', 64, 700)
		TextRenderer.draw(ctx, blockCX, blockTop, title, {
			font: titleFont,
			color: titleColor,
			align: 'center',
			baseline: 'top',
		})

		// Subtitle (12px gap below title)
		const { height: titleH } = TextRenderer.measure(ctx, title, titleFont)
		const subY = blockTop + titleH + 12
		const subFont = fontString('fuzzy-bubbles', 32, 400)
		TextRenderer.draw(ctx, blockCX, subY, subtitle, {
			font: subFont,
			color: titleColor,
			align: 'center',
			baseline: 'top',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Bird silhouette decorations
	//    Bird left:  left:12, top:293, rotate:-13.54deg
	//    Bird right: left:893, top:650, rotate:8.8deg
	//    Bird bottom-left: left:112, top:1172, rotate:36.94deg
	// ═══════════════════════════════════════════════════════════
	await drawRotatedPNG(ctx, BIRDS_PNG,
		12 + 235.695 / 2, 293 + 166.654 / 2,
		213.537, 120, -13.54, 0.70)

	await drawRotatedPNG(ctx, BIRDS_PNG,
		893 + 185.799 / 2, 650 + 186.942 / 2,
		162.631, 164, 8.8, 0.55)

	await drawRotatedPNG(ctx, BIRDS_PNG,
		112 + 228.547 / 2, 1172 + 228.819 / 2,
		162.631, 164, 36.94, 0.45)

	// ═══════════════════════════════════════════════════════════
	// 5. Large photo card (340:4558)
	//    Figma: centered, top:calc(50%+181px) = 675+181 = 856 center
	//    bg:#fafafa, border:1.915px solid #c9c9c9
	//    padding:32px, radius:22.981px, h:860
	//    Photo: h:796, w:868, radius:20
	// ═══════════════════════════════════════════════════════════
	{
		const cardH = 860
		const cardW = 868 + 32 * 2    // photo width + padding×2 = 932
		const cardX = (W - cardW) / 2 // centered ≈ 74
		const cardCY = H / 2 + 181    // 856
		const cardY = cardCY - cardH / 2 // 426

		const cardPad = 32
		const cardR = 22.981
		const photoW = 868
		const photoH = 796
		const photoR = 20

		// Card background with border
		ctx.save()
		ctx.shadowColor = 'rgba(0,0,0,0.08)'
		ctx.shadowBlur = 12
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 4
		Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR)
		ctx.fillStyle = '#fafafa'
		ctx.fill()
		ctx.strokeStyle = '#c9c9c9'
		ctx.lineWidth = 1.915
		ctx.stroke()
		ctx.restore()

		// Photo area
		const photoX = cardX + cardPad
		const photoY = cardY + cardPad

		if (config.photo) {
			try {
				const buf = fs.readFileSync(config.photo)
				const photo = await loadImage(buf)
				ctx.save()
				Effects.roundedRectPath(ctx, photoX, photoY, photoW, photoH, photoR)
				ctx.clip()

				// Cover-crop
				const imgRatio = photo.width / photo.height
				const frameRatio = photoW / photoH
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = photoH
					dw = photoH * imgRatio
				} else {
					dw = photoW
					dh = photoW / imgRatio
				}
				const dx = photoX + (photoW - dw) / 2
				const dy = photoY + (photoH - dh) / 2
				ctx.drawImage(photo, dx, dy, dw, dh)
				ctx.restore()
			} catch {
				ctx.save()
				Effects.roundedRectPath(ctx, photoX, photoY, photoW, photoH, photoR)
				ctx.fillStyle = '#d9d9d9'
				ctx.fill()
				ctx.restore()
			}
		} else {
			ctx.save()
			Effects.roundedRectPath(ctx, photoX, photoY, photoW, photoH, photoR)
			ctx.fillStyle = '#d9d9d9'
			ctx.fill()
			ctx.restore()
		}

		// ── Gradient overlay (bottom of photo) ──
		// Figma: mt:608 from photo top, h:188, w:868
		// transparent → #2a2a2a @71.54%
		{
			const gradY = photoY + 608
			const gradH = 188

			ctx.save()
			Effects.roundedRectPath(ctx, photoX, gradY, photoW, gradH, photoR)
			// Only round bottom corners — clip to bottom portion
			ctx.clip()

			const grad = ctx.createLinearGradient(photoX, gradY, photoX, gradY + gradH)
			grad.addColorStop(0, 'rgba(0,0,0,0)')
			grad.addColorStop(0.7154, 'rgba(42,42,42,1)')
			ctx.fillStyle = grad
			ctx.fillRect(photoX, gradY, photoW, gradH)
			ctx.restore()
		}

		// ── Photo label text ──
		// Figma: ml:334, mt:726 from photo top
		// Fuzzy Bubbles Bold 44px, white
		if (photoLabel) {
			const labelX = photoX + 334
			const labelY = photoY + 726
			const labelFont = fontString('fuzzy-bubbles-bold', 44, 700)

			TextRenderer.draw(ctx, labelX, labelY, photoLabel, {
				font: labelFont,
				color: '#ffffff',
				align: 'center',
				baseline: 'top',
			})
		}
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
