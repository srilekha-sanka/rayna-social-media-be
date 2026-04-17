/**
 * Template: Travel Destinations Slide (Carousel Item)
 * ====================================================
 * White background with gradient hero (#f9fafb → #bfddf8 → #fff),
 * logo + website pill header, large single photo card (832×858,
 * rounded 32, 3px white border), dark destination label box,
 * sub-labels row with separators, decorative clouds and birds.
 *
 * Paired with the `travel-destinations` cover template.
 *
 * Reference: Figma — "Instagram post - 56" (1080×1350)
 *
 * Config keys:
 *   photo          – Single destination photo path
 *   title          – Destination name (e.g., "Bali")
 *   subLabels      – ["XYZ Temple", "Waterfall", "Adventure Sports"]
 *   logoPath       – Brand logo path
 *   website        – "www.raynatours.com"
 *   titleColor     – Label box bg color (default: '#535353')
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

// ── Asset Paths ───────────────────────────────────────────────
const ASSETS_DIR = path.resolve(__dirname, '../../../../../assets/images')
const CLOUD_PNG = path.join(ASSETS_DIR, '33e6046884b9d2eab8c43e09dc39a10fd2f3ffb5.png')
const BIRDS_PNG = path.join(ASSETS_DIR, 'birds.png')

// ── Config ────────────────────────────────────────────────────

export interface TravelDestinationsSlideConfig {
	photo?: string             // single destination photo
	title?: string             // "Bali", "Indonesia", etc.
	subLabels?: string[]       // ["XYZ Temple", "Waterfall", "Adventure Sports"]
	logoPath?: string
	website?: string
	titleColor?: string        // label box bg (default: '#535353')
}

// ── PNG Helper ───────────────────────────────────────────────

async function drawPNG(
	ctx: SKRSContext2D, filePath: string,
	x: number, y: number, w: number, h: number,
	opacity: number = 1,
): Promise<void> {
	try {
		const buf = fs.readFileSync(filePath)
		const img = await loadImage(buf)
		ctx.save()
		ctx.globalAlpha = opacity
		ctx.drawImage(img, x, y, w, h)
		ctx.restore()
	} catch { /* skip */ }
}

// ── Globe icon ───────────────────────────────────────────────

function drawGlobeIcon(ctx: SKRSContext2D, cx: number, cy: number, size: number): void {
	const r = size / 2
	ctx.save()
	ctx.strokeStyle = '#555555'
	ctx.lineWidth = 1.4
	ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
	ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.38, r, 0, 0, Math.PI * 2); ctx.stroke()
	ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke()
	ctx.beginPath(); ctx.moveTo(cx - r + 1, cy - r * 0.36); ctx.lineTo(cx + r - 1, cy - r * 0.36); ctx.stroke()
	ctx.beginPath(); ctx.moveTo(cx - r + 1, cy + r * 0.36); ctx.lineTo(cx + r - 1, cy + r * 0.36); ctx.stroke()
	ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke()
	ctx.restore()
}

// ── Render Function ───────────────────────────────────────────

export async function renderTravelDestinationsSlide(
	config: TravelDestinationsSlideConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width    // 1080
	const H = dims.height   // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const title = config.title || 'Destination'
	const subLabels = config.subLabels || []
	const website = config.website || 'www.raynatours.com'
	const titleColor = config.titleColor || '#535353'

	// ═══════════════════════════════════════════════════════════
	// 1. White background
	// ═══════════════════════════════════════════════════════════
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Hero gradient (0 → 860)
	//    #f9fafb → #bfddf8 at 44.231% → #ffffff
	// ═══════════════════════════════════════════════════════════
	{
		const heroH = 860
		const grad = ctx.createLinearGradient(0, 0, 0, heroH)
		grad.addColorStop(0, '#f9fafb')
		grad.addColorStop(0.44231, '#bfddf8')
		grad.addColorStop(1, '#ffffff')
		ctx.fillStyle = grad
		ctx.fillRect(0, 0, W, heroH)
	}

	// ═══════════════════════════════════════════════════════════
	// 3. Decorative clouds (33e604... asset)
	//    Left:  left:-127, top:860, 368×460, opacity:0.68
	//    Right: left:728,  top:1047, 368×460, opacity:0.68
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, CLOUD_PNG, -127, 860, 368, 460, 0.68)
	await drawPNG(ctx, CLOUD_PNG, 728, 1047, 368, 460, 0.68)

	// ═══════════════════════════════════════════════════════════
	// 4. Top bar: Logo (left) + Website pill (right)
	//    HTML: left:40, top:32.95, width:1000
	// ═══════════════════════════════════════════════════════════

	// Logo
	if (config.logoPath) {
		try {
			const logoBuf = fs.readFileSync(config.logoPath)
			const logo = await loadImage(logoBuf)
			const maxLogoH = 72
			const maxLogoW = 194
			const ratio = Math.min(maxLogoW / logo.width, maxLogoH / logo.height)
			const lw = Math.round(logo.width * ratio)
			const lh = Math.round(logo.height * ratio)
			ctx.drawImage(logo, 40, 33, lw, lh)
		} catch { /* skip */ }
	} else {
		const brandFont = fontString('dm-sans-bold', 28, 700)
		TextRenderer.draw(ctx, 40, 69, 'RAYNA TOURS', {
			font: brandFont, color: '#0c2461', align: 'left', baseline: 'middle',
		})
	}

	// Website pill
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
		const pillY = 33

		ctx.save()
		Effects.roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillR)
		ctx.strokeStyle = '#7e7e7e'
		ctx.lineWidth = 1
		ctx.stroke()
		ctx.restore()

		const globeCX = pillX + pillPadX + globeSize / 2
		const globeCY = pillY + pillH / 2
		drawGlobeIcon(ctx, globeCX, globeCY, globeSize)

		const textStartX = globeCX + globeSize / 2 + globeGap
		TextRenderer.draw(ctx, textStartX, pillY + pillH / 2, website, {
			font: pillFont, color: '#000000', align: 'left', baseline: 'middle',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 5. Main photo card
	//    HTML: left:112, top:193, w:832, h:858, border:3px white, radius:32
	// ═══════════════════════════════════════════════════════════
	{
		const cardX = 112
		const cardY = 193
		const cardW = 832
		const cardH = 858
		const cardR = 32
		const borderW = 3

		// White border (drawn as a slightly larger rounded rect behind)
		ctx.save()
		Effects.roundedRectPath(ctx, cardX - borderW, cardY - borderW, cardW + borderW * 2, cardH + borderW * 2, cardR + borderW)
		ctx.fillStyle = '#ffffff'
		ctx.fill()
		ctx.restore()

		// Card background
		ctx.save()
		Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR)
		ctx.fillStyle = '#d9d9d9'
		ctx.fill()
		ctx.restore()

		// Photo
		if (config.photo) {
			try {
				const buf = fs.readFileSync(config.photo)
				const img = await loadImage(buf)
				ctx.save()
				Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR)
				ctx.clip()

				// Cover-crop
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
	// 6. Text section below card
	//    Content-block gap = 82px, so text starts at 193 + 858 + 82 = 1133
	// ═══════════════════════════════════════════════════════════
	{
		const textY = 1133

		// Destination label box: bg:#535353, p:24, radius:4
		const labelFont = fontString('montserrat', 40, 800)
		const { width: labelTW, height: labelTH } = TextRenderer.measure(ctx, title, labelFont)
		const labelPad = 24
		const labelBoxW = Math.max(labelTW + labelPad * 2, 258)
		const labelBoxH = labelTH + labelPad * 2
		const labelBoxX = (W - labelBoxW) / 2

		ctx.save()
		Effects.roundedRectPath(ctx, labelBoxX, textY, labelBoxW, labelBoxH, 4)
		ctx.fillStyle = titleColor
		ctx.fill()
		ctx.restore()

		TextRenderer.draw(ctx, W / 2, textY + labelPad, title, {
			font: labelFont, color: '#edeeef', align: 'center', baseline: 'top',
		})

		// Sub-labels row: gap:24, separators: 1×24 #b1b1b1
		if (subLabels.length > 0) {
			const subY = textY + labelBoxH + 32
			const subFont = fontString('dm-sans', 28, 400)
			const sepW = 1
			const sepH = 24
			const gap = 24

			// Calculate total width for centering
			let totalW = 0
			const widths: number[] = []
			for (const text of subLabels) {
				const { width: tw } = TextRenderer.measure(ctx, text, subFont)
				widths.push(tw)
				totalW += tw
			}
			totalW += (subLabels.length - 1) * (gap * 2 + sepW)

			let drawX = (W - totalW) / 2

			for (let i = 0; i < subLabels.length; i++) {
				TextRenderer.draw(ctx, drawX, subY, subLabels[i], {
					font: subFont, color: '#434343', align: 'left', baseline: 'top',
				})
				drawX += widths[i]

				if (i < subLabels.length - 1) {
					drawX += gap
					const sepCenterY = subY + 14
					ctx.fillStyle = '#b1b1b1'
					ctx.fillRect(drawX, sepCenterY - sepH / 2, sepW, sepH)
					drawX += sepW + gap
				}
			}
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 7. Bird silhouettes (birds.png)
	//    Left:  left:5,   top:1001, rotate(-13.54deg)
	//    Right: left:849, top:1209, rotate(8.8deg)
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, BIRDS_PNG,
		5 + 235.695 / 2 - 213.537 / 2, 1001 + 166.654 / 2 - 120 / 2,
		213.537, 120, 0.70)

	await drawPNG(ctx, BIRDS_PNG,
		849 + 185.799 / 2 - 162.631 / 2, 1209 + 186.942 / 2 - 164 / 2,
		162.631, 164, 0.55)

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
