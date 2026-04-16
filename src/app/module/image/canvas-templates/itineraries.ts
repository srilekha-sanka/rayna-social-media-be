/**
 * Template: Itineraries
 * =====================
 * White background with a Dubai skyline hero at the top (faded to white),
 * four scattered polaroid-style photo cards, a stats bar with icons,
 * headline "Your holiday to Dubai got easier", sub-row with schedule info,
 * and a bottom bar with logo + website pill.
 *
 * Reference: Figma — "Instagram post - 88" (1080x1350)
 *
 * Config keys:
 *   bgPhoto        – Background hero image path (skyline)
 *   photos         – [path1, path2, path3, path4] (four polaroid cards)
 *   headlineText   – Main headline (default: "Your holiday to Dubai got easier")
 *   headlineColor  – Headline color (default: '#0e3872')
 *   stats          – Array of { bold, text } for stats row
 *   subTexts       – Array of strings for the sub-row (default: ["Every Friday", "5 Nights & 6 Days"])
 *   subTextColor   – Sub text color (default: '#434343')
 *   logoPath       – Path to brand logo image
 *   website        – Website URL text (default: "www.raynatours.com")
 */
import { loadImage } from '@napi-rs/canvas'
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

// ── Config ────────────────────────────────────────────────────

export interface ItinerariesConfig {
	bgPhoto?: string              // background hero image (skyline)
	photos?: string[]             // 4 polaroid card photos
	headlineText?: string         // "Your holiday to Dubai got easier"
	headlineColor?: string        // '#0e3872'
	stats?: Array<{ bold: string; text: string }>
	subTexts?: string[]           // ["Every Friday", "5 Nights & 6 Days"]
	subTextColor?: string         // '#434343'
	logoPath?: string             // brand logo image path
	website?: string              // "www.raynatours.com"
}

// ── Polaroid Card Definitions ─────────────────────────────────
// Positions from the HTML: each card has left/top/rotation

interface PolaroidCardDef {
	cx: number
	cy: number
	rotation: number   // degrees
}

// Polaroid shared dimensions (from HTML: padding 23.8, photo 228x271)
const POLAROID = {
	padding: 23.8,
	border: 0.8,
	borderRadius: 9.5,
	photoW: 228,
	photoH: 271,
	photoR: 6,
}
const POLAROID_W = POLAROID.photoW + POLAROID.padding * 2  // ~275.6
const POLAROID_H = POLAROID.photoH + POLAROID.padding * 2  // ~318.6

// Card positions (from HTML left/top, converted to center coords)
// HTML cards include padding in the card-inner, so the outer wrapper
// is at the specified left/top and the card-inner size is POLAROID_W x POLAROID_H
const CARDS: PolaroidCardDef[] = [
	// Card 1: left:-12, top:440, rotate:-9.11deg
	{ cx: -12 + POLAROID_W / 2, cy: 440 + POLAROID_H / 2, rotation: -9.11 },
	// Card 2: left:230, top:448, rotate:-2.71deg
	{ cx: 230 + POLAROID_W / 2, cy: 448 + POLAROID_H / 2, rotation: -2.71 },
	// Card 3: left:476, top:430, rotate:11.17deg
	{ cx: 476 + POLAROID_W / 2, cy: 430 + POLAROID_H / 2, rotation: 11.17 },
	// Card 4: left:748, top:432, rotate:4.89deg
	{ cx: 748 + POLAROID_W / 2, cy: 432 + POLAROID_H / 2, rotation: 4.89 },
]

// ── Default Stats ─────────────────────────────────────────────

const DEFAULT_STATS = [
	{ bold: '4.9+ Rated ', text: 'Experiences' },
	{ bold: '1000+ Experiences t', text: 'o choose from' },
	{ bold: '25M+ Customer s', text: 'erved & counting' },
]

// ── Draw a single polaroid card ──────────────────────────────

async function drawPolaroidCard(
	ctx: SKRSContext2D, card: PolaroidCardDef, photoPath?: string,
): Promise<void> {
	const rot = card.rotation * Math.PI / 180

	ctx.save()
	ctx.translate(card.cx, card.cy)
	ctx.rotate(rot)

	// Polaroid background (#f5f5f5) with dashed border
	const px = -POLAROID_W / 2
	const py = -POLAROID_H / 2

	// Shadow
	ctx.shadowColor = 'rgba(0,0,0,0.12)'
	ctx.shadowBlur = 10
	ctx.shadowOffsetX = 2
	ctx.shadowOffsetY = 3

	Effects.roundedRectPath(ctx, px, py, POLAROID_W, POLAROID_H, POLAROID.borderRadius)
	ctx.fillStyle = '#f5f5f5'
	ctx.fill()

	// Reset shadow before dashed border
	ctx.shadowColor = 'transparent'
	ctx.shadowBlur = 0
	ctx.shadowOffsetX = 0
	ctx.shadowOffsetY = 0

	// Dashed border
	ctx.setLineDash([4, 3])
	ctx.strokeStyle = '#c0c0c0'
	ctx.lineWidth = POLAROID.border
	Effects.roundedRectPath(ctx, px, py, POLAROID_W, POLAROID_H, POLAROID.borderRadius)
	ctx.stroke()
	ctx.setLineDash([])

	// Photo slot
	const photoX = -POLAROID.photoW / 2
	const photoY = -POLAROID.photoH / 2

	if (photoPath) {
		try {
			const buf = fs.readFileSync(photoPath)
			const photo = await loadImage(buf)

			ctx.save()
			Effects.roundedRectPath(ctx, photoX, photoY, POLAROID.photoW, POLAROID.photoH, POLAROID.photoR)
			ctx.clip()

			// Cover-crop
			const imgRatio = photo.width / photo.height
			const frameRatio = POLAROID.photoW / POLAROID.photoH
			let dw: number, dh: number
			if (imgRatio > frameRatio) {
				dh = POLAROID.photoH
				dw = POLAROID.photoH * imgRatio
			} else {
				dw = POLAROID.photoW
				dh = POLAROID.photoW / imgRatio
			}
			ctx.drawImage(photo, -dw / 2, -dh / 2, dw, dh)
			ctx.restore()
		} catch {
			// Fallback placeholder
			ctx.save()
			Effects.roundedRectPath(ctx, photoX, photoY, POLAROID.photoW, POLAROID.photoH, POLAROID.photoR)
			ctx.fillStyle = '#d9d9d9'
			ctx.fill()
			ctx.restore()
		}
	} else {
		// Placeholder
		ctx.save()
		Effects.roundedRectPath(ctx, photoX, photoY, POLAROID.photoW, POLAROID.photoH, POLAROID.photoR)
		ctx.fillStyle = '#d9d9d9'
		ctx.fill()
		ctx.restore()
	}

	ctx.restore()
}

// ── Draw stat icon (circle with symbol) ──────────────────────

function drawStatIcon(
	ctx: SKRSContext2D,
	cx: number, cy: number,
	type: 'star' | 'badge' | 'people',
): void {
	const r = 16  // 32px diameter / 2

	ctx.save()

	// Circle background
	let bgColor: string
	let iconColor: string
	switch (type) {
		case 'star':
			bgColor = '#FFF3DF'
			iconColor = '#F5A623'
			break
		case 'badge':
			bgColor = '#E3EEFF'
			iconColor = '#2563EB'
			break
		case 'people':
			bgColor = '#E8F5E9'
			iconColor = '#2E7D32'
			break
	}

	// Draw circle
	ctx.beginPath()
	ctx.arc(cx, cy, r, 0, Math.PI * 2)
	ctx.fillStyle = bgColor
	ctx.fill()

	// Draw icon symbol
	ctx.fillStyle = iconColor
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'

	switch (type) {
		case 'star':
			// 5-point star
			drawStar(ctx, cx, cy - 1, 8, 4, 5)
			break
		case 'badge':
			// 5-point star (badge style)
			drawStar(ctx, cx, cy - 2, 9, 4, 5)
			break
		case 'people':
			// Person icon: head circle + body arc
			ctx.beginPath()
			ctx.arc(cx, cy - 5, 4, 0, Math.PI * 2)
			ctx.fill()
			ctx.beginPath()
			ctx.arc(cx, cy + 10, 8, Math.PI + 0.3, -0.3)
			ctx.fill()
			break
	}

	ctx.restore()
}

function drawStar(
	ctx: SKRSContext2D,
	cx: number, cy: number,
	outerR: number, innerR: number, points: number,
): void {
	ctx.beginPath()
	for (let i = 0; i < points * 2; i++) {
		const r = i % 2 === 0 ? outerR : innerR
		const angle = (Math.PI / points) * i - Math.PI / 2
		const x = cx + r * Math.cos(angle)
		const y = cy + r * Math.sin(angle)
		if (i === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.closePath()
	ctx.fill()
}

// ── Draw globe icon for website pill ─────────────────────────

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

	// Horizontal line
	ctx.beginPath()
	ctx.moveTo(cx - r, cy)
	ctx.lineTo(cx + r, cy)
	ctx.stroke()

	// Vertical line
	ctx.beginPath()
	ctx.moveTo(cx, cy - r)
	ctx.lineTo(cx, cy + r)
	ctx.stroke()

	ctx.restore()
}

// ── Render Function ───────────────────────────────────────────

export async function renderItineraries(
	config: ItinerariesConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width    // 1080
	const H = dims.height   // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const headlineText = config.headlineText || 'Your holiday to Dubai got easier'
	const headlineColor = config.headlineColor || '#0e3872'
	const stats = config.stats || DEFAULT_STATS
	const subTexts = config.subTexts || ['Every Friday', '5 Nights & 6 Days']
	const subTextColor = config.subTextColor || '#434343'
	const website = config.website || 'www.raynatours.com'

	// ═══════════════════════════════════════════════════════════
	// 1. White background
	// ═══════════════════════════════════════════════════════════
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Background hero image (top portion)
	//    HTML: left:0, top:-125, w:1080, h:820, opacity:0.9
	// ═══════════════════════════════════════════════════════════
	if (config.bgPhoto) {
		try {
			const buf = fs.readFileSync(config.bgPhoto)
			const hero = await loadImage(buf)

			ctx.save()
			ctx.globalAlpha = 0.9
			// Clip to visible area
			ctx.beginPath()
			ctx.rect(0, 0, W, 695)  // top:-125 + height:820 = 695 visible
			ctx.clip()

			// Cover-crop into 1080x820 area offset at top:-125
			const imgRatio = hero.width / hero.height
			const frameW = 1080, frameH = 820
			const frameRatio = frameW / frameH
			let dw: number, dh: number
			if (imgRatio > frameRatio) {
				dh = frameH
				dw = frameH * imgRatio
			} else {
				dw = frameW
				dh = frameW / imgRatio
			}
			const dx = (frameW - dw) / 2
			const dy = -125 + (frameH - dh) / 2
			ctx.drawImage(hero, dx, dy, dw, dh)
			ctx.restore()
		} catch { /* skip */ }
	}

	// ═══════════════════════════════════════════════════════════
	// 3. Gradient fade: hero → white
	//    HTML: top:440, height:460, gradient from transparent to white
	// ═══════════════════════════════════════════════════════════
	{
		const gradY = 440
		const gradH = 460
		const grad = ctx.createLinearGradient(0, gradY, 0, gradY + gradH)
		grad.addColorStop(0, 'rgba(255,255,255,0)')
		grad.addColorStop(0.4, 'rgba(255,255,255,0.5)')
		grad.addColorStop(0.8, 'rgba(255,255,255,1)')
		ctx.fillStyle = grad
		ctx.fillRect(0, gradY, W, gradH)
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Four polaroid photo cards
	// ═══════════════════════════════════════════════════════════
	for (let i = 0; i < CARDS.length; i++) {
		await drawPolaroidCard(ctx, CARDS[i], config.photos?.[i])
	}

	// ═══════════════════════════════════════════════════════════
	// 5. Stats bar
	//    HTML: top:876, height:74 (between two divider lines)
	// ═══════════════════════════════════════════════════════════
	{
		const statsY = 876
		const statsH = 74
		const padX = 28

		// Top divider
		ctx.fillStyle = '#e0e0e0'
		ctx.fillRect(0, statsY, W, 1)

		// Background
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(0, statsY + 1, W, statsH)

		// Bottom divider
		ctx.fillStyle = '#e0e0e0'
		ctx.fillRect(0, statsY + 1 + statsH, W, 1)

		// Stats items
		const iconTypes: Array<'star' | 'badge' | 'people'> = ['star', 'badge', 'people']
		const n = Math.min(stats.length, 3)
		const availW = W - padX * 2
		const sectionW = availW / n
		const centerY = statsY + 1 + statsH / 2

		const statFont = fontString('dm-sans', 18, 400)
		const statBoldFont = fontString('dm-sans-bold', 18, 700)

		for (let i = 0; i < n; i++) {
			const stat = stats[i]
			const sectionX = padX + i * sectionW

			// Icon
			const iconX = sectionX + 16
			drawStatIcon(ctx, iconX, centerY, iconTypes[i] || 'star')

			// Text (bold part + normal part)
			const textX = iconX + 26
			ctx.save()

			// Measure bold part to position normal part after it
			const boldMetrics = TextRenderer.measure(ctx, stat.bold, statBoldFont)

			// Draw bold part
			TextRenderer.draw(ctx, textX, centerY, stat.bold, {
				font: statBoldFont,
				color: '#111111',
				align: 'left',
				baseline: 'middle',
			})

			// Draw normal part
			TextRenderer.draw(ctx, textX + boldMetrics.width, centerY, stat.text, {
				font: statFont,
				color: '#111111',
				align: 'left',
				baseline: 'middle',
			})

			ctx.restore()

			// Separator (except after last item)
			if (i < n - 1) {
				const sepX = sectionX + sectionW
				ctx.fillStyle = '#e0e0e0'
				ctx.fillRect(sepX, centerY - 24, 1, 48)
			}
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Headline text
	//    HTML: top:1050, font-size:64px, color:#0e3872, centered
	// ═══════════════════════════════════════════════════════════
	{
		const hlFont = fontString('dm-sans', 64, 400)
		const hlY = 1050

		// Auto-fit if text is too wide
		const maxW = W - 80  // 40px padding each side
		const { width: textW } = TextRenderer.measure(ctx, headlineText, hlFont)
		let finalFont = hlFont
		if (textW > maxW) {
			// Scale down to fit
			const scale = maxW / textW
			const newSize = Math.floor(64 * scale)
			finalFont = fontString('dm-sans', newSize, 400)
		}

		TextRenderer.draw(ctx, W / 2, hlY, headlineText, {
			font: finalFont,
			color: headlineColor,
			align: 'center',
			baseline: 'top',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 7. Sub-row (e.g. "Every Friday | 5 Nights & 6 Days")
	//    HTML: top ~1132 (1050 + headline height + 18px gap)
	// ═══════════════════════════════════════════════════════════
	{
		const subFont = fontString('dm-sans', 30, 400)
		const subY = 1150
		const sepW = 1
		const sepH = 26
		const gap = 24

		// Calculate total width for centering
		let totalW = 0
		const widths: number[] = []
		for (const text of subTexts) {
			const { width: tw } = TextRenderer.measure(ctx, text, subFont)
			widths.push(tw)
			totalW += tw
		}
		totalW += (subTexts.length - 1) * (gap * 2 + sepW)

		let drawX = (W - totalW) / 2

		for (let i = 0; i < subTexts.length; i++) {
			TextRenderer.draw(ctx, drawX, subY, subTexts[i], {
				font: subFont,
				color: subTextColor,
				align: 'left',
				baseline: 'top',
			})
			drawX += widths[i]

			if (i < subTexts.length - 1) {
				drawX += gap
				// Separator line
				const sepCenterY = subY + 15  // roughly center of text
				ctx.fillStyle = '#b0b0b0'
				ctx.fillRect(drawX, sepCenterY - sepH / 2, sepW, sepH)
				drawX += sepW + gap
			}
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 8. Bottom bar: logo + website pill
	//    HTML: left:40, top:1250, width:1000
	// ═══════════════════════════════════════════════════════════
	{
		const barY = 1260
		const barLeft = 40
		const barRight = W - 40

		// Logo (left side)
		if (config.logoPath) {
			try {
				const logoBuf = fs.readFileSync(config.logoPath)
				const logo = await loadImage(logoBuf)
				const maxLogoH = 54
				const maxLogoW = 200
				const ratio = Math.min(maxLogoW / logo.width, maxLogoH / logo.height)
				const lw = Math.round(logo.width * ratio)
				const lh = Math.round(logo.height * ratio)
				ctx.drawImage(logo, barLeft, barY + (54 - lh) / 2, lw, lh)
			} catch { /* skip */ }
		} else {
			// Fallback: draw brand text
			const brandFont = fontString('dm-sans-bold', 28, 700)
			TextRenderer.draw(ctx, barLeft, barY + 14, 'RAYNA TOURS', {
				font: brandFont,
				color: '#0c2461',
				align: 'left',
				baseline: 'middle',
			})
		}

		// Website pill (right side)
		{
			const pillH = 54
			const pillR = 12
			const pillPadX = 24
			const pillFont = fontString('dm-sans', 20, 400)
			const globeSize = 20
			const globeGap = 10

			const { width: webTW } = TextRenderer.measure(ctx, website, pillFont)
			const pillContentW = globeSize + globeGap + webTW
			const pillW = pillContentW + pillPadX * 2
			const pillX = barRight - pillW
			const pillY = barY

			// Pill border
			ctx.save()
			Effects.roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillR)
			ctx.strokeStyle = '#dedede'
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
				color: '#111111',
				align: 'left',
				baseline: 'middle',
			})
		}
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
