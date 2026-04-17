/**
 * Template: Explore Activities
 * ============================
 * Clean white-to-gray gradient poster with decorative cloud blobs,
 * bold stacked headline tags, three scattered polaroid-style photo
 * cards with rotations, bird silhouettes, and a horizontal stats
 * footer bar at the bottom.
 *
 * Reference: Figma node 364:4879 (Instagram 1080×1350)
 *
 * Config keys:
 *   headlineWords     – ["Explore.", "Thrilling.", "Activities."]
 *   photos            – [path1, path2, path3] (three activity photos)
 *   logoPath          – Brand logo path
 *   website           – "www.raynatours.com"
 *   headlineColor     – Headline tag bg color (default: '#2b2b2b')
 *   stats             – Array of { boldText, normalText, iconType }
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
const CLOUD_PNG = path.join(ASSETS_DIR, 'cloud.png')
const BIRDS_PNG = path.join(ASSETS_DIR, 'birds.png')

// ── Config ────────────────────────────────────────────────────

export interface ExploreActivitiesConfig {
	headlineWords?: string[]
	photos?: string[]           // 3 photo paths
	logoPath?: string
	website?: string
	headlineColor?: string      // headline tag background
	stats?: Array<{
		boldText: string
		normalText: string
		iconType: 'star' | 'shield' | 'gift'
	}>
}

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
	} catch { /* skip if asset not found */ }
}

// ── Stat Icon Helpers ────────────────────────────────────────

function drawStatIcon(
	ctx: SKRSContext2D,
	cx: number, cy: number,
	type: 'star' | 'shield' | 'gift',
): void {
	const r = 16

	ctx.save()

	let bgColor: string
	let iconColor: string
	switch (type) {
		case 'star':
			bgColor = '#FFF3DF'
			iconColor = '#F5A623'
			break
		case 'shield':
			bgColor = '#E3EEFF'
			iconColor = '#2563EB'
			break
		case 'gift':
			bgColor = '#E8F5E9'
			iconColor = '#2E7D32'
			break
	}

	// Circle background
	ctx.beginPath()
	ctx.arc(cx, cy, r, 0, Math.PI * 2)
	ctx.fillStyle = bgColor
	ctx.fill()

	// Icon symbol
	ctx.fillStyle = iconColor
	switch (type) {
		case 'star':
			drawStar(ctx, cx, cy - 1, 8, 4, 5)
			break
		case 'shield':
			drawStar(ctx, cx, cy - 2, 9, 4, 5)
			break
		case 'gift':
			// Person/gift icon
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

// ── Card System ───────────────────────────────────────────────

interface CardDef {
	frameCX: number; frameCY: number
	frameW: number; frameH: number
	frameBorder: number; frameR: number
	innerCX: number; innerCY: number
	innerW: number; innerH: number
	innerR: number
	photoW: number; photoH: number; photoR: number
	rotation: number
}

// Card-stack origin: the card-stack sits at the right of content-row
// content-row: left:52, top:208, width:946, justify-content:space-between
// card-stack: width:474, so its left edge = 52 + 946 - 474 = 524
const CS_X = 524   // card-stack absolute left
const CS_Y = 208   // card-stack absolute top (= content-row top)

const CARDS: CardDef[] = [
	// Card 1 (+7.69°)
	// HTML shadow wrapper: left:5.1 top:-18.17 w:428.116 h:341.275
	// HTML main wrapper: left:32.5 top:-37.33 w:437.948 h:337.37
	// Shadow border: w:392.671 h:291.369 border:4.262 radius:8.142
	// Main card: w:403.318 h:285.992 radius:9.025, photo: w:374.541 h:257.215 radius:9.025
	{
		frameCX: CS_X + 5.1 + 428.116 / 2,
		frameCY: CS_Y + (-18.17) + 341.275 / 2,
		frameW: 392.671, frameH: 291.369, frameBorder: 4.262, frameR: 8.142,
		innerCX: CS_X + 32.5 + 437.948 / 2,
		innerCY: CS_Y + (-37.33) + 337.37 / 2,
		innerW: 403.318, innerH: 285.992, innerR: 9.025,
		photoW: 374.541, photoH: 257.215, photoR: 9.025,
		rotation: 7.69,
	},
	// Card 2 (0°)
	// HTML shadow: left:24.17 top:314.97 w:392.671 h:291.369 (no rotation)
	// HTML main: left:48.05 top:292.41 w:403.318 h:285.992
	{
		frameCX: CS_X + 24.17 + 392.671 / 2,
		frameCY: CS_Y + 314.97 + 291.369 / 2,
		frameW: 392.671, frameH: 291.369, frameBorder: 4.262, frameR: 8.142,
		innerCX: CS_X + 48.05 + 403.318 / 2,
		innerCY: CS_Y + 292.41 + 285.992 / 2,
		innerW: 403.318, innerH: 285.992, innerR: 9.025,
		photoW: 374.541, photoH: 257.215, photoR: 9.025,
		rotation: 0,
	},
	// Card 3 (-4.81°)
	// HTML shadow wrapper: left:48.55 top:612.58 w:416.486 h:323.865
	// HTML main wrapper: left:10.51 top:592.69 w:427.938 h:320.345
	// Shadow border: w:393.395 h:291.906 border:4.27 radius:8.157
	// Main card: w:405.268 h:287.375 radius:9.069, photo: w:376.352 h:258.458 radius:9.069
	{
		frameCX: CS_X + 48.55 + 416.486 / 2,
		frameCY: CS_Y + 612.58 + 323.865 / 2,
		frameW: 393.395, frameH: 291.906, frameBorder: 4.27, frameR: 8.157,
		innerCX: CS_X + 10.51 + 427.938 / 2,
		innerCY: CS_Y + 592.69 + 320.345 / 2,
		innerW: 405.268, innerH: 287.375, innerR: 9.069,
		photoW: 376.352, photoH: 258.458, photoR: 9.069,
		rotation: -4.81,
	},
]

async function drawCard(ctx: SKRSContext2D, card: CardDef, photoPath?: string): Promise<void> {
	const rot = card.rotation * Math.PI / 180

	// ── 1. Black border frame (just a stroke, no fill) ──
	ctx.save()
	ctx.translate(card.frameCX, card.frameCY)
	ctx.rotate(rot)
	Effects.roundedRectPath(ctx, -card.frameW / 2, -card.frameH / 2, card.frameW, card.frameH, card.frameR)
	ctx.strokeStyle = '#000000'
	ctx.lineWidth = card.frameBorder
	ctx.stroke()
	ctx.restore()

	// ── 2. White card with shadow ──
	ctx.save()
	ctx.translate(card.innerCX, card.innerCY)
	ctx.rotate(rot)
	ctx.shadowColor = 'rgba(0,0,0,0.25)'
	ctx.shadowBlur = 16.5
	ctx.shadowOffsetX = 2.06
	ctx.shadowOffsetY = 3.1
	Effects.roundedRectPath(ctx, -card.innerW / 2, -card.innerH / 2, card.innerW, card.innerH, card.innerR)
	ctx.fillStyle = '#f8f8f8'
	ctx.fill()
	ctx.restore()

	// ── 3. Photo inside card ──
	if (photoPath) {
		try {
			const buf = fs.readFileSync(photoPath)
			const photo = await loadImage(buf)
			ctx.save()
			ctx.translate(card.innerCX, card.innerCY)
			ctx.rotate(rot)

			Effects.roundedRectPath(ctx, -card.photoW / 2, -card.photoH / 2, card.photoW, card.photoH, card.photoR)
			ctx.clip()

			// Cover-crop
			const imgRatio = photo.width / photo.height
			const frameRatio = card.photoW / card.photoH
			let dw: number, dh: number
			if (imgRatio > frameRatio) {
				dh = card.photoH
				dw = card.photoH * imgRatio
			} else {
				dw = card.photoW
				dh = card.photoW / imgRatio
			}
			ctx.drawImage(photo, -dw / 2, -dh / 2, dw, dh)
			ctx.restore()
		} catch {
			ctx.save()
			ctx.translate(card.innerCX, card.innerCY)
			ctx.rotate(rot)
			ctx.fillStyle = '#d9d9d9'
			ctx.fillRect(-card.photoW / 2, -card.photoH / 2, card.photoW, card.photoH)
			ctx.restore()
		}
	} else {
		ctx.save()
		ctx.translate(card.innerCX, card.innerCY)
		ctx.rotate(rot)
		ctx.fillStyle = '#d9d9d9'
		ctx.fillRect(-card.photoW / 2, -card.photoH / 2, card.photoW, card.photoH)
		ctx.restore()
	}
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

	ctx.beginPath()
	ctx.arc(cx, cy, r, 0, Math.PI * 2)
	ctx.stroke()

	ctx.beginPath()
	ctx.ellipse(cx, cy, r * 0.38, r, 0, 0, Math.PI * 2)
	ctx.stroke()

	ctx.beginPath()
	ctx.moveTo(cx - r, cy)
	ctx.lineTo(cx + r, cy)
	ctx.stroke()

	ctx.beginPath()
	ctx.moveTo(cx, cy - r)
	ctx.lineTo(cx, cy + r)
	ctx.stroke()

	ctx.restore()
}

// ── Render Function ───────────────────────────────────────────

export async function renderExploreActivities(
	config: ExploreActivitiesConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width
	const H = dims.height
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const headlineWords = config.headlineWords || ['Explore.', 'Thrilling.', 'Activities.']
	const website = config.website || 'www.raynatours.com'
	const headlineBgColor = config.headlineColor || '#535353'
	const stats = config.stats || [
		{ boldText: '4.9+ Rated ', normalText: 'Experiences', iconType: 'star' as const },
		{ boldText: '1000+ Experiences ', normalText: 'to choose from', iconType: 'shield' as const },
		{ boldText: '25M+ Customer ', normalText: 'served & counting', iconType: 'gift' as const },
	]

	// ═══════════════════════════════════════════════════════════
	// 1. Background gradient (125.56°, soft white → light gray)
	// ═══════════════════════════════════════════════════════════
	const bgGrad = ctx.createLinearGradient(-137, 192, 1217, 1158)
	bgGrad.addColorStop(0.0732, '#f7f7f7')
	bgGrad.addColorStop(0.8546, '#ececec')
	ctx.fillStyle = bgGrad
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Decorative clouds (real PNG)
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, CLOUD_PNG, -80, -50, 500, 260, 0.90)
	await drawPNG(ctx, CLOUD_PNG, 680, -20, 420, 220, 0.80)
	await drawPNG(ctx, CLOUD_PNG, 500, 280, 400, 200, 0.65)
	await drawPNG(ctx, CLOUD_PNG, -60, 520, 420, 210, 0.60)
	await drawPNG(ctx, CLOUD_PNG, 60, 900, 480, 240, 0.55)
	await drawPNG(ctx, CLOUD_PNG, 650, 1050, 380, 190, 0.50)

	// ═══════════════════════════════════════════════════════════
	// 3. Top bar: Logo (left) + Website pill (right)
	//    Matching itineraries/summer-holiday layout
	// ═══════════════════════════════════════════════════════════

	// Logo (left side — Figma: 52, 52, 194×72)
	if (config.logoPath) {
		try {
			const logoBuf = fs.readFileSync(config.logoPath)
			const logo = await loadImage(logoBuf)
			const maxLogoH = 72
			const maxLogoW = 194
			const ratio = Math.min(maxLogoW / logo.width, maxLogoH / logo.height)
			const lw = Math.round(logo.width * ratio)
			const lh = Math.round(logo.height * ratio)
			ctx.drawImage(logo, 52, 52, lw, lh)
		} catch { /* skip */ }
	} else {
		const brandFont = fontString('dm-sans-bold', 28, 700)
		TextRenderer.draw(ctx, 52, 88, 'RAYNA TOURS', {
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
		const globeSize = 22
		const globeGap = 11

		const { width: webTW } = TextRenderer.measure(ctx, website, pillFont)
		const pillContentW = globeSize + globeGap + webTW
		const pillW = pillContentW + pillPadX * 2
		const pillX = W - 52 - pillW
		const pillY = 60

		// Semi-transparent white bg + border
		ctx.save()
		Effects.roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillR)
		ctx.fillStyle = 'rgba(255,255,255,0.8)'
		ctx.fill()
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
			color: '#000000',
			align: 'left',
			baseline: 'middle',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Headline tags — "Explore.", "Thrilling.", "Activities."
	// ═══════════════════════════════════════════════════════════
	const headX = 52
	let curY = 400
	const hlFont = fontString('montserrat', 40, 700)
	const hlPad = 24
	const hlGap = 24

	for (const word of headlineWords) {
		const { width: tw, height: th } = TextRenderer.measure(ctx, word, hlFont)

		ctx.save()
		ctx.fillStyle = headlineBgColor
		ctx.fillRect(headX, curY, tw + hlPad * 2, th + hlPad * 2)
		ctx.restore()

		TextRenderer.draw(ctx, headX + hlPad, curY + hlPad, word, {
			font: hlFont, color: '#edeeef', align: 'left', baseline: 'top',
		})

		curY += th + hlPad * 2 + hlGap
	}

	// ═══════════════════════════════════════════════════════════
	// 5. Photo cards (3 cards)
	// ═══════════════════════════════════════════════════════════
	for (let i = 0; i < CARDS.length; i++) {
		await drawCard(ctx, CARDS[i], config.photos?.[i])
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Bird silhouettes (birds.png asset)
	//    HTML: left:-5 top:941 rotate(-13.54deg)
	//          left:849 top:1099 rotate(8.8deg)
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, BIRDS_PNG,
		-5 + 235.695 / 2 - 213.537 / 2, 941 + 166.654 / 2 - 120 / 2,
		213.537, 120, 0.70)

	await drawPNG(ctx, BIRDS_PNG,
		849 + 185.799 / 2 - 162.631 / 2, 1099 + 186.942 / 2 - 164 / 2,
		162.631, 164, 0.55)

	// ═══════════════════════════════════════════════════════════
	// 7. Stats footer bar
	//    HTML: top:1212, w:1080, shadow: 2px 2px 4px rgba(0,0,0,0.12)
	//    divider → 24px gap → stats row → 24px gap → divider
	// ═══════════════════════════════════════════════════════════
	{
		const statsTop = 1212
		const padX = 24

		// Top divider
		ctx.fillStyle = '#e6e6e6'
		ctx.fillRect(0, statsTop, W, 1)

		// Stats row area (between dividers, with 24px gap each side)
		const rowY = statsTop + 1 + 24
		const rowH = 48  // icon/text height
		const bottomDivY = rowY + rowH + 24

		// White background with shadow behind stats area
		ctx.save()
		ctx.shadowColor = 'rgba(0,0,0,0.12)'
		ctx.shadowBlur = 4
		ctx.shadowOffsetX = 2
		ctx.shadowOffsetY = 2
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(0, statsTop + 1, W, bottomDivY - statsTop)
		ctx.restore()

		// Bottom divider
		ctx.fillStyle = '#e6e6e6'
		ctx.fillRect(0, bottomDivY, W, 1)

		const iconTypes: Array<'star' | 'shield' | 'gift'> = ['star', 'shield', 'gift']
		const n = Math.min(stats.length, 3)
		const availW = W - padX * 2
		const sectionW = availW / n
		const centerY = rowY + rowH / 2

		const statFont = fontString('dm-sans', 18, 400)
		const statBoldFont = fontString('dm-sans-bold', 18, 700)

		for (let i = 0; i < n; i++) {
			const s = stats[i]
			const sectionX = padX + i * sectionW

			// Icon
			const iconX = sectionX + 16
			drawStatIcon(ctx, iconX, centerY, iconTypes[i] || 'star')

			// Text (bold part + normal part)
			const textX = iconX + 26
			ctx.save()

			const boldMetrics = TextRenderer.measure(ctx, s.boldText, statBoldFont)

			TextRenderer.draw(ctx, textX, centerY, s.boldText, {
				font: statBoldFont,
				color: '#000000',
				align: 'left',
				baseline: 'middle',
			})

			TextRenderer.draw(ctx, textX + boldMetrics.width, centerY, s.normalText, {
				font: statFont,
				color: '#000000',
				align: 'left',
				baseline: 'middle',
			})

			ctx.restore()

			// Separator (except after last item)
			if (i < n - 1) {
				const sepX = sectionX + sectionW
				ctx.fillStyle = '#eaeaea'
				ctx.fillRect(sepX, centerY - 24, 1, 48)
			}
		}
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
