/**
 * Template: Summer Holiday Packages
 * ==================================
 * White background with a hero photo at the top, four scattered
 * polaroid-style photo cards with rotations, a dark-blue decorative
 * wave blob (Vector 1), headline text "Summer Holiday Packages" in
 * Fuzzy Bubbles, and a white "Book now" pill button.
 *
 * Reference: Figma node 334:3805 — "Instagram post - 9" (1080×1350)
 *
 * Config keys:
 *   heroPhoto      – Background hero image path
 *   photos         – [path1, path2, path3, path4] (four polaroid cards)
 *   headlineText   – Main headline (default: "Summer Holiday Packages")
 *   ctaText        – Button text (default: "Book now")
 *   headlineColor  – Headline + CTA text color (default: '#0e3872')
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

// ── Asset Paths ───────────────────────────────────────────────
const ASSETS_DIR = path.resolve(__dirname, '../../../../../assets/images')
const VECTOR1_PNG = path.join(ASSETS_DIR, 'Vector 1.png')

// ── Config ────────────────────────────────────────────────────

export interface SummerHolidayConfig {
	heroPhoto?: string          // background hero image
	photos?: string[]           // 4 polaroid card photos
	headlineText?: string       // "Summer Holiday Packages"
	ctaText?: string            // "Book now"
	headlineColor?: string      // '#0e3872'
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

// ── Polaroid Card Definitions ─────────────────────────────────
// All coords at full 1080×1350 scale (HTML was at 50%)
// Each card has: center x/y of the outer wrapper, rotation,
// and the polaroid + photo dimensions are shared.

interface PolaroidCardDef {
	cx: number       // center X of the card wrapper
	cy: number       // center Y of the card wrapper
	rotation: number // degrees
}

// Polaroid shared dimensions (full scale)
const POLAROID = {
	padding: 27.424,
	border: 0.914,
	borderRadius: 10.97,
	photoW: 263.371,
	photoH: 312.636,
	photoR: 10.97,
}
// Total polaroid box size
const POLAROID_W = POLAROID.photoW + POLAROID.padding * 2  // ~318.22
const POLAROID_H = POLAROID.photoH + POLAROID.padding * 2  // ~367.48

// Card positions (outer wrapper center coords, full scale)
const CARDS: PolaroidCardDef[] = [
	// Card 4: far left — rotate:-9.11deg
	// outer: left:-24, top:535, w:375.582, h:433.097
	{ cx: -24 + 375.582 / 2, cy: 535 + 433.097 / 2, rotation: -9.11 },
	// Card 1: second from left — rotate:-2.71deg
	// outer: left:275.69, top:551.44, w:336.199, h:402.216
	{ cx: 275.69 + 336.199 / 2, cy: 551.44 + 402.216 / 2, rotation: -2.71 },
	// Card 2: centre — rotate:+11.17deg
	// outer: left:536.47, top:532.16, w:387.268, h:441.893
	{ cx: 536.47 + 387.268 / 2, cy: 532.16 + 441.893 / 2, rotation: 11.17 },
	// Card 3: right — rotate:+4.89deg
	// outer: left:850, top:535, w:350.13, h:413.334
	{ cx: 850 + 350.13 / 2, cy: 535 + 413.334 / 2, rotation: 4.89 },
]

// ── Draw a single polaroid card ──────────────────────────────

async function drawPolaroidCard(
	ctx: SKRSContext2D, card: PolaroidCardDef, photoPath?: string,
): Promise<void> {
	const rot = card.rotation * Math.PI / 180

	ctx.save()
	ctx.translate(card.cx, card.cy)
	ctx.rotate(rot)

	// ── 1. Polaroid background (#f5f5f5) with dashed border ──
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
	ctx.strokeStyle = '#bebebe'
	ctx.lineWidth = POLAROID.border
	Effects.roundedRectPath(ctx, px, py, POLAROID_W, POLAROID_H, POLAROID.borderRadius)
	ctx.stroke()
	ctx.setLineDash([])

	// ── 2. Photo slot ──
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

// ── Render Function ───────────────────────────────────────────

export async function renderSummerHoliday(
	config: SummerHolidayConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width    // 1080
	const H = dims.height   // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	// Defaults
	const headlineText = config.headlineText || 'Summer Holiday Packages'
	const ctaText = config.ctaText || 'Book now'
	const headlineColor = config.headlineColor || '#0e3872'

	// ═══════════════════════════════════════════════════════════
	// 1. White background
	// ═══════════════════════════════════════════════════════════
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Hero background image (top half)
	//    Figma: left:0, top:-125, w:1200, h:800, object-cover
	// ═══════════════════════════════════════════════════════════
	if (config.heroPhoto) {
		try {
			const buf = fs.readFileSync(config.heroPhoto)
			const hero = await loadImage(buf)

			ctx.save()
			// Clip to the visible area (top portion of frame)
			ctx.beginPath()
			ctx.rect(0, 0, W, 800)
			ctx.clip()

			// Cover-crop into 1200×800 area offset at top:-125
			const imgRatio = hero.width / hero.height
			const frameW = 1200, frameH = 800
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
	// 3. Four polaroid photo cards
	//    Drawn in z-order: card4(back), card1, card2(front), card3
	// ═══════════════════════════════════════════════════════════
	for (let i = 0; i < CARDS.length; i++) {
		await drawPolaroidCard(ctx, CARDS[i], config.photos?.[i])
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Dark blue wave blob — Vector 1 (334:3817)
	//    Figma: left:627, top:1096, w:491, h:288
	//    Slight overflow: ~2% extra on each side
	// ═══════════════════════════════════════════════════════════
	await drawPNG(ctx, VECTOR1_PNG, 617, 1086, 501, 298)

	// ═══════════════════════════════════════════════════════════
	// 5. "Summer Holiday Packages" headline text (334:3821)
	//    Figma: Fuzzy Bubbles Regular, 120px, #0e3872
	//    left: calc(50% - 264px) = 276, bottom-edge at top:1240
	//    → text baseline at y ≈ 1240
	// ═══════════════════════════════════════════════════════════
	{
		const hlFont = fontString('fuzzy-bubbles', 120, 400)
		const textX = 276
		const textBottomY = 1240

		ctx.save()
		TextRenderer.draw(ctx, textX, textBottomY, headlineText, {
			font: hlFont,
			color: headlineColor,
			align: 'left',
			baseline: 'bottom',
		})
		ctx.restore()
	}

	// ═══════════════════════════════════════════════════════════
	// 6. "Book now" button (334:3818)
	//    Figma: left:810, top:1240, bg:white, px:24, py:12, r:12
	//    Text: Fuzzy Bubbles Bold, 32px, #0e3872
	// ═══════════════════════════════════════════════════════════
	{
		const btnFont = fontString('fuzzy-bubbles-bold', 32, 700)
		const { width: tw, height: th } = TextRenderer.measure(ctx, ctaText, btnFont)
		const padX = 24, padY = 12
		const btnX = 810
		const btnY = 1240
		const btnW = tw + padX * 2
		const btnH = th + padY * 2

		// White background pill
		ctx.save()
		Effects.roundedRectPath(ctx, btnX, btnY, btnW, btnH, 12)
		ctx.fillStyle = '#ffffff'
		ctx.fill()
		ctx.restore()

		// Button text
		TextRenderer.draw(ctx, btnX + padX, btnY + padY, ctaText, {
			font: btnFont,
			color: headlineColor,
			align: 'left',
			baseline: 'top',
		})
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
