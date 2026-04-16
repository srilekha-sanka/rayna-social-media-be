/**
 * Template: Itineraries Slide (Carousel Item)
 * =============================================
 * White background with logo + website pill header, "Day N" title
 * with activity subtitle, a large split photo card (two images
 * side-by-side with a thin white divider), and decorative bird
 * silhouettes scattered at three positions.
 *
 * Paired with the `itineraries` cover template.
 *
 * Reference: Figma — "Instagram post - 83" (1080x1350)
 *
 * Config keys:
 *   dayNumber     – Day number (e.g. 1, 2, 3)
 *   dayLabel      – Override full label (default: "Day {dayNumber}")
 *   subtitle      – Activity name (e.g., "Dhow Cruise Marina")
 *   photos        – [leftPhoto, rightPhoto] for split view (or single photo)
 *   logoPath      – Brand logo image path
 *   website       – Website URL text (default: "www.raynatours.com")
 *   titleColor    – Title + subtitle color (default: '#596d89')
 */
import { loadImage } from '@napi-rs/canvas'
import path from 'path'
import fs from 'fs'
import {
	createTemplateCanvas,
	INSTAGRAM,
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

export interface ItinerariesSlideConfig {
	dayNumber?: number        // 1, 2, 3...
	dayLabel?: string         // "Day 1" (override)
	subtitle?: string         // "Dhow Cruise Marina"
	photos?: string[]         // [leftPhoto, rightPhoto] or [singlePhoto]
	logoPath?: string         // brand logo image path
	website?: string          // "www.raynatours.com"
	titleColor?: string       // '#596d89'
}

// ── PNG Helper ───────────────────────────────────────────────

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
	} catch { /* skip if asset not found */ }
}

// ── Globe icon for website pill ──────────────────────────────

function drawGlobeIcon(
	ctx: SKRSContext2D,
	cx: number, cy: number,
	size: number,
): void {
	const r = size / 2
	ctx.save()
	ctx.strokeStyle = '#444444'
	ctx.lineWidth = 1.4

	// Outer circle
	ctx.beginPath()
	ctx.arc(cx, cy, r, 0, Math.PI * 2)
	ctx.stroke()

	// Vertical ellipse
	ctx.beginPath()
	ctx.ellipse(cx, cy, r * 0.38, r, 0, 0, Math.PI * 2)
	ctx.stroke()

	// Horizontal lines (two latitude lines + equator)
	ctx.beginPath()
	ctx.moveTo(cx - r, cy)
	ctx.lineTo(cx + r, cy)
	ctx.stroke()

	// Upper latitude
	ctx.beginPath()
	ctx.moveTo(cx - r + 1, cy - r * 0.36)
	ctx.lineTo(cx + r - 1, cy - r * 0.36)
	ctx.stroke()

	// Lower latitude
	ctx.beginPath()
	ctx.moveTo(cx - r + 1, cy + r * 0.36)
	ctx.lineTo(cx + r - 1, cy + r * 0.36)
	ctx.stroke()

	// Vertical line (meridian)
	ctx.beginPath()
	ctx.moveTo(cx, cy - r)
	ctx.lineTo(cx, cy + r)
	ctx.stroke()

	ctx.restore()
}

// ── Render Function ───────────────────────────────────────────

export async function renderItinerariesSlide(
	config: ItinerariesSlideConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width    // 1080
	const H = dims.height   // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const dayNumber = config.dayNumber || 1
	const dayLabel = config.dayLabel || `Day ${dayNumber}`
	const subtitle = config.subtitle || ''
	const website = config.website || 'www.raynatours.com'
	const titleColor = config.titleColor || '#596d89'

	// ═══════════════════════════════════════════════════════════
	// 1. White background
	// ═══════════════════════════════════════════════════════════
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Top bar: logo (left) + website pill (right)
	//    HTML: left:40, top:40, width:1000
	// ═══════════════════════════════════════════════════════════

	// Logo (left side)
	if (config.logoPath) {
		await Components.placeLogo(ctx, config.logoPath, 40, 40, 194, 72)
	} else {
		// Fallback text logo
		ctx.save()
		const brandFont = fontString('dm-sans-bold', 28, 700)
		TextRenderer.draw(ctx, 40, 76, 'RAYNA TOURS', {
			font: brandFont,
			color: '#0c2461',
			align: 'left',
			baseline: 'middle',
		})
		ctx.restore()
	}

	// Website pill (right side)
	{
		const pillH = 54
		const pillR = 12
		const pillPadX = 24
		const pillFont = fontString('dm-sans', 20, 400)
		const globeSize = 22
		const globeGap = 11

		const { width: webTW } = TextRenderer.measure(ctx, website, pillFont)
		const pillContentW = globeSize + globeGap + webTW
		const pillW = pillContentW + pillPadX * 2
		const pillX = 1040 - pillW
		const pillY = 40

		// Pill border
		ctx.save()
		Effects.roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillR)
		ctx.strokeStyle = '#7e7e7e'
		ctx.lineWidth = 1
		ctx.stroke()
		ctx.restore()

		// Globe icon
		const globeCX = pillX + pillPadX + globeSize / 2
		const globeCY = pillY + pillH / 2
		drawGlobeIcon(ctx, globeCX, globeCY, globeSize)

		// Website text
		const textStartX = globeCX + globeSize / 2 + globeGap
		TextRenderer.draw(ctx, textStartX, pillY + pillH / 2, website, {
			font: pillFont,
			color: '#000000',
			align: 'left',
			baseline: 'middle',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 3. Title block: "Day N" + subtitle
	//    HTML: left:212, top:224, width:657, centered
	//    day-label: 64px bold #596d89
	//    day-subtitle: 32px regular #596d89
	// ═══════════════════════════════════════════════════════════
	{
		const blockCX = W / 2  // center
		const blockTop = 224

		// Day label (bold)
		const dayFont = fontString('dm-sans-bold', 64, 700)
		TextRenderer.draw(ctx, blockCX, blockTop, dayLabel, {
			font: dayFont,
			color: titleColor,
			align: 'center',
			baseline: 'top',
		})

		// Subtitle (12px gap below day label)
		if (subtitle) {
			const { height: dayH } = TextRenderer.measure(ctx, dayLabel, dayFont)
			const subY = blockTop + dayH + 12
			const subFont = fontString('dm-sans', 32, 400)

			// Auto-fit subtitle if too wide
			const maxSubW = 657
			const { width: subW } = TextRenderer.measure(ctx, subtitle, subFont)
			let finalSubFont = subFont
			if (subW > maxSubW) {
				const scale = maxSubW / subW
				const newSize = Math.floor(32 * scale)
				finalSubFont = fontString('dm-sans', newSize, 400)
			}

			TextRenderer.draw(ctx, blockCX, subY, subtitle, {
				font: finalSubFont,
				color: titleColor,
				align: 'center',
				baseline: 'top',
			})
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Bird silhouette decorations (from birds.png asset)
	//    Three groups at different positions and rotations:
	//    - Top-left:    left:12,  top:293,  rotate:-13.54deg
	//    - Right:       left:893, top:650,  rotate:8.8deg
	//    - Bottom-left: left:112, top:1172, rotate:36.94deg
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
	// 5. Main photo card (split view)
	//    HTML: left:86, top:459, width:908, height:648, radius:24
	//    Two images side-by-side with a thin white divider (3px)
	// ═══════════════════════════════════════════════════════════
	{
		const cardX = 86
		const cardY = 459
		const cardW = 908
		const cardH = 648
		const cardR = 24
		const dividerW = 3

		// Card background (placeholder)
		ctx.save()
		Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR)
		ctx.fillStyle = '#d9d9d9'
		ctx.fill()
		ctx.restore()

		const photos = config.photos || []
		const hasLeftPhoto = photos.length >= 1
		const hasRightPhoto = photos.length >= 2

		if (hasLeftPhoto && hasRightPhoto) {
			// Split view: clip to full rounded card, draw both halves inside
			const halfW = (cardW - dividerW) / 2
			const midX = cardX + halfW

			// Clip entire card to rounded rect — corners handled once
			ctx.save()
			Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR)
			ctx.clip()

			// Left photo — simple rect clip within the card clip
			try {
				const leftBuf = fs.readFileSync(photos[0])
				const leftImg = await loadImage(leftBuf)
				ctx.save()
				ctx.beginPath()
				ctx.rect(cardX, cardY, halfW, cardH)
				ctx.clip()

				const imgRatio = leftImg.width / leftImg.height
				const frameRatio = halfW / cardH
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = cardH
					dw = cardH * imgRatio
				} else {
					dw = halfW
					dh = halfW / imgRatio
				}
				ctx.drawImage(leftImg, cardX + (halfW - dw) / 2, cardY + (cardH - dh) / 2, dw, dh)
				ctx.restore()
			} catch { /* skip */ }

			// Right photo — simple rect clip within the card clip
			try {
				const rightBuf = fs.readFileSync(photos[1])
				const rightImg = await loadImage(rightBuf)
				const rightX = midX + dividerW
				const rightW = cardW - halfW - dividerW

				ctx.save()
				ctx.beginPath()
				ctx.rect(rightX, cardY, rightW, cardH)
				ctx.clip()

				const imgRatio = rightImg.width / rightImg.height
				const frameRatio = rightW / cardH
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = cardH
					dw = cardH * imgRatio
				} else {
					dw = rightW
					dh = rightW / imgRatio
				}
				ctx.drawImage(rightImg, rightX + (rightW - dw) / 2, cardY + (cardH - dh) / 2, dw, dh)
				ctx.restore()
			} catch { /* skip */ }

			// White divider line — drawn last, on top of both photos
			ctx.fillStyle = 'rgba(255,255,255,0.5)'
			ctx.fillRect(midX, cardY, dividerW, cardH)

			ctx.restore()  // restore card-level clip
		} else if (hasLeftPhoto) {
			// Single photo: fill entire card
			try {
				const buf = fs.readFileSync(photos[0])
				const img = await loadImage(buf)
				ctx.save()
				Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR)
				ctx.clip()

				const imgRatio = img.width / img.height
				const frameRatio = cardW / cardH
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = cardH
					dw = cardH * imgRatio
				} else {
					dw = cardW
					dh = cardW / imgRatio
				}
				ctx.drawImage(img, cardX + (cardW - dw) / 2, cardY + (cardH - dh) / 2, dw, dh)
				ctx.restore()
			} catch { /* skip */ }
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Small vector dot at bottom center
	//    HTML: left:593.85, top:1346.29, 3.6x2.9, #596d89
	// ═══════════════════════════════════════════════════════════
	{
		ctx.save()
		ctx.fillStyle = titleColor
		ctx.beginPath()
		ctx.ellipse(595.65, 1347.7, 1.8, 1.44, 0, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
