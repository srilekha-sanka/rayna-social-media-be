/**
 * Template: Explore Activities
 * ============================
 * Clean white-to-gray gradient poster with decorative cloud blobs,
 * bold stacked headline tags, stats section with icons, three
 * scattered polaroid-style photo cards with rotations, and bird
 * silhouettes.
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

// ── Icon Helpers ──────────────────────────────────────────────

function drawStarIcon(ctx: SKRSContext2D, cx: number, cy: number, r: number): void {
	ctx.save()
	ctx.fillStyle = '#f4c430'
	ctx.beginPath()
	for (let i = 0; i < 10; i++) {
		const angle = (i * 36 - 90) * Math.PI / 180
		const rad = i % 2 === 0 ? r : r * 0.45
		const px = cx + Math.cos(angle) * rad
		const py = cy + Math.sin(angle) * rad
		if (i === 0) ctx.moveTo(px, py)
		else ctx.lineTo(px, py)
	}
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}

function drawShieldIcon(ctx: SKRSContext2D, cx: number, cy: number, r: number): void {
	ctx.save()
	ctx.fillStyle = '#3355cc'
	ctx.beginPath()
	ctx.moveTo(cx, cy - r)
	ctx.lineTo(cx + r, cy - r * 0.55)
	ctx.lineTo(cx + r, cy + r * 0.1)
	ctx.quadraticCurveTo(cx + r, cy + r * 0.7, cx, cy + r)
	ctx.quadraticCurveTo(cx - r, cy + r * 0.7, cx - r, cy + r * 0.1)
	ctx.lineTo(cx - r, cy - r * 0.55)
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}

function drawGiftIcon(ctx: SKRSContext2D, cx: number, cy: number, r: number): void {
	ctx.save()
	// Bottom box
	ctx.fillStyle = '#e67e22'
	const bw = r * 1.5, bh = r * 0.9
	Effects.roundedRectPath(ctx, cx - bw / 2, cy + r * 0.1, bw, bh, 3)
	ctx.fill()
	// Middle box
	const mw = r * 1.1, mh = r * 0.55
	Effects.roundedRectPath(ctx, cx - mw / 2, cy - r * 0.35, mw, mh, 2)
	ctx.fill()
	// Top handle
	ctx.fillStyle = '#f39c12'
	const tw = r * 0.5, th = r * 0.55
	Effects.roundedRectPath(ctx, cx - tw / 2, cy - r * 0.85, tw, th, 2)
	ctx.fill()
	ctx.restore()
}

const ICON_DRAWERS: Record<string, (ctx: SKRSContext2D, cx: number, cy: number, r: number) => void> = {
	star: drawStarIcon,
	shield: drawShieldIcon,
	gift: drawGiftIcon,
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

// Right column origin in Figma coords (1080×1350)
const RC_X = 524
const RC_Y = 208

const CARDS: CardDef[] = [
	// Card 1: Desert Safari (+7.69°)
	{
		frameCX: RC_X - 59 + 490.8 / 2,
		frameCY: RC_Y - 36.7 + 391.2 / 2,
		frameW: 450.2, frameH: 334, frameBorder: 4.88, frameR: 9.34,
		innerCX: RC_X - 27.6 + 502.2 / 2,
		innerCY: RC_Y - 58.6 + 386.8 / 2,
		innerW: 462.4, innerH: 328, innerR: 10.34,
		photoW: 429.4, photoH: 295, photoR: 10.34,
		rotation: 7.69,
	},
	// Card 2: Kayaking (0°)
	{
		frameCX: RC_X - 37.2 + 450.2 / 2,
		frameCY: RC_Y + 345.2 + 334 / 2,
		frameW: 450.2, frameH: 334, frameBorder: 4.88, frameR: 9.34,
		innerCX: RC_X - 9.8 + 462.4 / 2,
		innerCY: RC_Y + 319.4 + 328 / 2,
		innerW: 462.4, innerH: 328, innerR: 10.34,
		photoW: 429.4, photoH: 295, photoR: 10.34,
		rotation: 0,
	},
	// Card 3: Zipline (-4.81°)
	{
		frameCX: RC_X - 9.2 + 477.6 / 2,
		frameCY: RC_Y + 686.4 + 371.4 / 2,
		frameW: 451, frameH: 334.6, frameBorder: 4.9, frameR: 9.36,
		innerCX: RC_X - 52.8 + 490.6 / 2,
		innerCY: RC_Y + 663.6 + 367.2 / 2,
		innerW: 464.6, innerH: 329.4, innerR: 10.4,
		photoW: 431.5, photoH: 296.4, photoR: 10.4,
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
			const photo = await loadImage(photoPath)
			ctx.save()
			ctx.translate(card.innerCX, card.innerCY)
			ctx.rotate(rot)

			// Clip to photo area with rounded corners
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
		// Placeholder gradient
		ctx.save()
		ctx.translate(card.innerCX, card.innerCY)
		ctx.rotate(rot)
		ctx.fillStyle = '#d9d9d9'
		ctx.fillRect(-card.photoW / 2, -card.photoH / 2, card.photoW, card.photoH)
		ctx.restore()
	}
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
	const headlineBgColor = config.headlineColor || '#2b2b2b'
	const stats = config.stats || [
		{ boldText: '4.9+ Rated ', normalText: 'Experiences', iconType: 'star' as const },
		{ boldText: '1000+ Experiences ', normalText: 'to choose from', iconType: 'shield' as const },
		{ boldText: '1L+ Customers ', normalText: 'served & counting', iconType: 'gift' as const },
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
	// 2. Decorative clouds (real PNG — prominent, clearly visible)
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, CLOUD_PNG, -80, -50, 500, 260, 0.90)     // top-left large
	await drawPNG(ctx, CLOUD_PNG, 680, -20, 420, 220, 0.80)     // top-right
	await drawPNG(ctx, CLOUD_PNG, 500, 280, 400, 200, 0.65)     // mid-right
	await drawPNG(ctx, CLOUD_PNG, -60, 520, 420, 210, 0.60)     // mid-left
	await drawPNG(ctx, CLOUD_PNG, 60, 900, 480, 240, 0.55)      // bottom-left large
	await drawPNG(ctx, CLOUD_PNG, 650, 1050, 380, 190, 0.50)    // bottom-right

	// ═══════════════════════════════════════════════════════════
	// 3. Logo (top-left — Figma: 52, 52, 194×72)
	// ═══════════════════════════════════════════════════════════
	if (config.logoPath) {
		await Components.placeLogo(ctx, config.logoPath, 52, 52, 194, 72)
	} else {
		ctx.save()
		ctx.font = preset('playlist', 42)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#C0392B'
		ctx.fillText('Rayna', 52, 52)
		const rw = ctx.measureText('Rayna').width
		ctx.font = preset('montserrat', 11)
		ctx.fillStyle = '#888888'
		ctx.fillText('tours', 52 + rw + 4, 78)
		ctx.restore()
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Website badge (top-right — Figma: 753, 70)
	// ═══════════════════════════════════════════════════════════
	{
		const badgeFont = preset('dm-sans', 20)
		const { width: tw } = TextRenderer.measure(ctx, website, badgeFont)
		const iconSz = 22
		const padX = 24, padY = 16, gap = 11
		const bw = padX + iconSz + gap + tw + padX
		const bh = padY * 2 + 22
		const bx = 753, by = 70

		// White bg + border
		ctx.save()
		Effects.roundedRectPath(ctx, bx, by, bw, bh, 12)
		ctx.fillStyle = '#ffffff'
		ctx.fill()
		ctx.strokeStyle = '#dedede'
		ctx.lineWidth = 2
		ctx.stroke()
		ctx.restore()

		// Globe icon (circle + crosshairs)
		const gx = bx + padX + iconSz / 2
		const gy = by + bh / 2
		const gr = iconSz / 2
		ctx.save()
		ctx.strokeStyle = '#444'
		ctx.lineWidth = 2.5
		ctx.beginPath()
		ctx.arc(gx, gy, gr, 0, Math.PI * 2)
		ctx.stroke()
		ctx.beginPath()
		ctx.moveTo(gx - gr, gy)
		ctx.lineTo(gx + gr, gy)
		ctx.stroke()
		ctx.beginPath()
		ctx.moveTo(gx, gy - gr)
		ctx.lineTo(gx, gy + gr)
		ctx.stroke()
		ctx.restore()

		// URL text
		TextRenderer.draw(ctx, bx + padX + iconSz + gap, by + padY, website, {
			font: badgeFont, color: '#000000', align: 'left', baseline: 'top',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 5. Headline tags — "Explore.", "Thrilling.", "Activities."
	//    Positioned mid-left to align with cards vertically
	// ═══════════════════════════════════════════════════════════
	const headX = 52
	let curY = 400
	const hlFont = fontString('montserrat', 40, 700)
	const hlPad = 24
	const hlGap = 24

	for (const word of headlineWords) {
		const { width: tw, height: th } = TextRenderer.measure(ctx, word, hlFont)

		// Dark background band
		ctx.save()
		ctx.fillStyle = headlineBgColor
		ctx.fillRect(headX, curY, tw + hlPad * 2, th + hlPad * 2)
		ctx.restore()

		// White text on dark band
		TextRenderer.draw(ctx, headX + hlPad, curY + hlPad, word, {
			font: hlFont, color: '#edeeef', align: 'left', baseline: 'top',
		})

		curY += th + hlPad * 2 + hlGap
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Stats section (below headlines, 64px gap)
	// ═══════════════════════════════════════════════════════════
	curY += 64 - hlGap  // adjust: hlGap was added after last headline
	const sX = headX + 24  // stats left padding
	const iconR = 16       // 32px icon diameter
	const sBoldFont = preset('dm-sans-bold', 18)
	const sNormFont = preset('dm-sans', 18)
	const sRowGap = 20

	for (let i = 0; i < stats.length; i++) {
		const s = stats[i]

		// Icon
		const iconCX = sX + iconR
		const iconCY = curY + iconR
		ICON_DRAWERS[s.iconType]?.(ctx, iconCX, iconCY, iconR)

		// Bold + normal text
		const textX = sX + iconR * 2 + 10
		const textY = curY + 8
		TextRenderer.draw(ctx, textX, textY, s.boldText, {
			font: sBoldFont, color: '#000000', align: 'left', baseline: 'top',
		})
		const { width: boldW } = TextRenderer.measure(ctx, s.boldText, sBoldFont)
		TextRenderer.draw(ctx, textX + boldW, textY, s.normalText, {
			font: sNormFont, color: '#000000', align: 'left', baseline: 'top',
		})

		curY += iconR * 2 + sRowGap

		// Vertical divider between stats
		if (i < stats.length - 1) {
			ctx.save()
			ctx.fillStyle = '#b5b5b5'
			ctx.fillRect(sX, curY, 2, 48)
			ctx.restore()
			curY += 48 + sRowGap
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 7. Photo cards (3 cards, drawn in order for correct stacking)
	// ═══════════════════════════════════════════════════════════
	for (let i = 0; i < CARDS.length; i++) {
		await drawCard(ctx, CARDS[i], config.photos?.[i])
	}

	// ═══════════════════════════════════════════════════════════
	// 8. Bird silhouettes (real PNG)
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, BIRDS_PNG, 180, 50, 300, 90, 0.75)       // top flock
	await drawPNG(ctx, BIRDS_PNG, 20, H - 140, 200, 60, 0.50)   // bottom-left flock

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
