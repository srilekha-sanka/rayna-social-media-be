/**
 * Template: Travel Destinations
 * ==============================
 * Gradient hero (#f9fafb → #bfddf8 → #ffffff) with three tall
 * vertical photo cards (270×710, rounded 24), stats bar, dark
 * tagline box, offer text, decorative clouds and bird silhouettes.
 *
 * Reference: Figma — "Instagram post - 54 · Travel. Relax. Repeat." (1080×1350)
 *
 * Config keys:
 *   photos         – [path1, path2, path3] (three tall card photos)
 *   cardLabels     – [{ title, subtitle }] for each card
 *   taglineText    – "Travel. Relax. Repeat."
 *   offerText      – "Book at 15% off"
 *   logoPath       – Brand logo path
 *   website        – "www.raynatours.com"
 *   taglineColor   – Tagline box bg color (default: '#535353')
 *   offerColor     – Offer text color (default: '#5a5a5a')
 *   stats          – Array of { bold, text } for stats row
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

export interface TravelDestinationsConfig {
	photos?: string[]                    // 3 tall card photos
	cardLabels?: Array<{ title: string; subtitle: string }>
	taglineText?: string                 // "Travel. Relax. Repeat."
	offerText?: string                   // "Book at 15% off"
	logoPath?: string
	website?: string
	taglineColor?: string                // '#535353'
	offerColor?: string                  // '#5a5a5a'
	stats?: Array<{ bold: string; text: string }>
}

// ── Default Stats ─────────────────────────────────────────────

const DEFAULT_STATS = [
	{ bold: '4.9+ Rated ', text: 'Experiences' },
	{ bold: '1000+ Experiences t', text: 'o choose from' },
	{ bold: '25M+ Customer s', text: 'erved & counting' },
]

// ── PNG Asset Helper ──────────────────────────────────────────

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

// ── Stat Icon Helpers ────────────────────────────────────────

function drawStatIcon(
	ctx: SKRSContext2D,
	cx: number, cy: number,
	type: 'star' | 'badge' | 'people',
): void {
	const r = 16
	ctx.save()

	let bgColor: string
	let iconColor: string
	switch (type) {
		case 'star':   bgColor = '#FFF3DF'; iconColor = '#F5A623'; break
		case 'badge':  bgColor = '#E3EEFF'; iconColor = '#2563EB'; break
		case 'people': bgColor = '#E8F5E9'; iconColor = '#2E7D32'; break
	}

	ctx.beginPath()
	ctx.arc(cx, cy, r, 0, Math.PI * 2)
	ctx.fillStyle = bgColor
	ctx.fill()

	ctx.fillStyle = iconColor
	switch (type) {
		case 'star':
			drawStar(ctx, cx, cy - 1, 8, 4, 5)
			break
		case 'badge':
			drawStar(ctx, cx, cy - 2, 9, 4, 5)
			break
		case 'people':
			ctx.beginPath(); ctx.arc(cx, cy - 5, 4, 0, Math.PI * 2); ctx.fill()
			ctx.beginPath(); ctx.arc(cx, cy + 10, 8, Math.PI + 0.3, -0.3); ctx.fill()
			break
	}
	ctx.restore()
}

function drawStar(
	ctx: SKRSContext2D,
	cx: number, cy: number, outerR: number, innerR: number, points: number,
): void {
	ctx.beginPath()
	for (let i = 0; i < points * 2; i++) {
		const r = i % 2 === 0 ? outerR : innerR
		const angle = (Math.PI / points) * i - Math.PI / 2
		const x = cx + r * Math.cos(angle)
		const y = cy + r * Math.sin(angle)
		if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
	}
	ctx.closePath()
	ctx.fill()
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

// ── Card Definitions ─────────────────────────────────────────

const CARDS_X = 112   // cards-container left
const CARDS_Y = 193   // cards-container top
const CARD_W = 270
const CARD_H = 710
const CARD_R = 24
const CARD_GAP = 23   // 293 - 270 = 23px gap

const CARD_POSITIONS = [
	{ x: CARDS_X, y: CARDS_Y },
	{ x: CARDS_X + CARD_W + CARD_GAP, y: CARDS_Y },
	{ x: CARDS_X + (CARD_W + CARD_GAP) * 2, y: CARDS_Y },
]

// ── Render Function ───────────────────────────────────────────

export async function renderTravelDestinations(
	config: TravelDestinationsConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width    // 1080
	const H = dims.height   // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const taglineText = config.taglineText || 'Travel. Relax. Repeat.'
	const offerText = config.offerText || 'Book at 15% off'
	const website = config.website || 'www.raynatours.com'
	const taglineColor = config.taglineColor || '#535353'
	const offerColor = config.offerColor || '#5a5a5a'
	const stats = config.stats || DEFAULT_STATS
	const cardLabels = config.cardLabels || []

	// ═══════════════════════════════════════════════════════════
	// 1. White background
	// ═══════════════════════════════════════════════════════════
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Hero gradient section (0→860)
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
	// 3. Decorative clouds
	//    Left:  left:-127, top:860, 368×349, opacity:0.68
	//    Right: left:728,  top:1047, 368×349, opacity:0.68
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
	// 5. Three tall photo cards (270×710, radius:24)
	//    Container: left:112, top:193, w:856, h:710
	// ═══════════════════════════════════════════════════════════
	const photos = config.photos || []

	for (let i = 0; i < 3; i++) {
		const pos = CARD_POSITIONS[i]
		const photoPath = photos[i]

		// Card background
		ctx.save()
		Effects.roundedRectPath(ctx, pos.x, pos.y, CARD_W, CARD_H, CARD_R)
		ctx.fillStyle = '#d0d0d0'
		ctx.fill()
		ctx.restore()

		// Photo
		if (photoPath) {
			try {
				const buf = fs.readFileSync(photoPath)
				const img = await loadImage(buf)
				ctx.save()
				Effects.roundedRectPath(ctx, pos.x, pos.y, CARD_W, CARD_H, CARD_R)
				ctx.clip()

				// Cover-crop
				const imgRatio = img.width / img.height
				const frameRatio = CARD_W / CARD_H
				let dw: number, dh: number
				if (imgRatio > frameRatio) {
					dh = CARD_H
					dw = CARD_H * imgRatio
				} else {
					dw = CARD_W
					dh = CARD_W / imgRatio
				}
				ctx.drawImage(img, pos.x + (CARD_W - dw) / 2, pos.y + (CARD_H - dh) / 2, dw, dh)
				ctx.restore()
			} catch {
				// placeholder already drawn
			}
		}

		// Card label (title + subtitle) at top of card
		const label = cardLabels[i]
		if (label) {
			const labelY = pos.y + 28
			const labelCX = pos.x + CARD_W / 2

			// Title (28px, semibold, white, with text shadow)
			const titleFont = fontString('dm-sans-bold', 28, 700)
			TextRenderer.draw(ctx, labelCX, labelY, label.title, {
				font: titleFont,
				color: '#ffffff',
				align: 'center',
				baseline: 'top',
				shadow: { offsetX: 0, offsetY: 1, blur: 4, color: 'rgba(0,0,0,0.5)' },
			})

			// Subtitle (20px, regular, white)
			if (label.subtitle) {
				const { height: titleH } = TextRenderer.measure(ctx, label.title, titleFont)
				const subFont = fontString('dm-sans', 20, 400)
				TextRenderer.draw(ctx, labelCX, labelY + titleH + 4, label.subtitle, {
					font: subFont,
					color: '#ffffff',
					align: 'center',
					baseline: 'top',
					shadow: { offsetX: 0, offsetY: 1, blur: 4, color: 'rgba(0,0,0,0.5)' },
				})
			}
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Stats bar at top:967
	// ═══════════════════════════════════════════════════════════
	{
		const statsTop = 967
		const padX = 24
		const rowGap = 24

		ctx.fillStyle = '#e6e6e6'
		ctx.fillRect(0, statsTop, W, 1)

		const rowY = statsTop + 1 + rowGap
		const rowH = 48
		const bottomDivY = rowY + rowH + rowGap

		// White background with shadow
		ctx.save()
		ctx.shadowColor = 'rgba(0,0,0,0.12)'
		ctx.shadowBlur = 4
		ctx.shadowOffsetX = 2
		ctx.shadowOffsetY = 2
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(0, statsTop + 1, W, bottomDivY - statsTop)
		ctx.restore()

		ctx.fillStyle = '#e6e6e6'
		ctx.fillRect(0, bottomDivY, W, 1)

		const iconTypes: Array<'star' | 'badge' | 'people'> = ['star', 'badge', 'people']
		const n = Math.min(stats.length, 3)
		const availW = W - padX * 2
		const sectionW = availW / n
		const centerY = rowY + rowH / 2

		const statFont = fontString('dm-sans', 18, 400)
		const statBoldFont = fontString('dm-sans-bold', 18, 700)

		for (let i = 0; i < n; i++) {
			const s = stats[i]
			const sectionX = padX + i * sectionW

			const iconX = sectionX + 16
			drawStatIcon(ctx, iconX, centerY, iconTypes[i] || 'star')

			const textX = iconX + 26
			const boldMetrics = TextRenderer.measure(ctx, s.bold, statBoldFont)

			TextRenderer.draw(ctx, textX, centerY, s.bold, {
				font: statBoldFont, color: '#000000', align: 'left', baseline: 'middle',
			})
			TextRenderer.draw(ctx, textX + boldMetrics.width, centerY, s.text, {
				font: statFont, color: '#000000', align: 'left', baseline: 'middle',
			})

			if (i < n - 1) {
				const sepX = sectionX + sectionW
				ctx.fillStyle = '#eaeaea'
				ctx.fillRect(sepX, centerY - 24, 1, 48)
			}
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 7. Bird silhouettes
	//    Left:  left:5,   top:1001, rotate(-13.54deg)
	//    Right: left:849, top:1209, rotate(8.8deg)
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, BIRDS_PNG,
		5 + 235.695 / 2 - 213.537 / 2, 1001 + 166.654 / 2 - 120 / 2,
		213.537, 120, 0.70)

	await drawPNG(ctx, BIRDS_PNG,
		849 + 185.799 / 2 - 162.631 / 2, 1209 + 186.942 / 2 - 164 / 2,
		162.631, 164, 0.55)

	// ═══════════════════════════════════════════════════════════
	// 8. Text block: tagline box + offer text
	//    HTML: left:50%, top:1133, centered
	//    Tagline: bg:#535353, padding:24, radius:4, 40px 900weight #edeeef
	//    Offer: 40px 600weight #5a5a5a
	// ═══════════════════════════════════════════════════════════
	{
		const textBlockY = 1133
		const textGap = 32

		// Tagline box
		const tagFont = fontString('montserrat', 40, 800)
		const { width: tagTW, height: tagTH } = TextRenderer.measure(ctx, taglineText, tagFont)
		const tagPad = 24
		const tagBoxW = tagTW + tagPad * 2
		const tagBoxH = tagTH + tagPad * 2
		const tagBoxX = (W - tagBoxW) / 2

		// Dark background
		ctx.save()
		Effects.roundedRectPath(ctx, tagBoxX, textBlockY, tagBoxW, tagBoxH, 4)
		ctx.fillStyle = taglineColor
		ctx.fill()
		ctx.restore()

		// Tagline text
		TextRenderer.draw(ctx, W / 2, textBlockY + tagPad, taglineText, {
			font: tagFont, color: '#edeeef', align: 'center', baseline: 'top',
		})

		// Offer text
		const offerY = textBlockY + tagBoxH + textGap
		const offerFont = fontString('dm-sans-bold', 40, 700)
		TextRenderer.draw(ctx, W / 2, offerY, offerText, {
			font: offerFont, color: offerColor, align: 'center', baseline: 'top',
		})
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
