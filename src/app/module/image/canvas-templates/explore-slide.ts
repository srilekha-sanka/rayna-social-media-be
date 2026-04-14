/**
 * Template: Explore Slide (Carousel Item)
 * ========================================
 * Single activity card for the explore carousel.
 * Slide 1 = explore-activities (overview with 3 cards + stats).
 * Slides 2+ = this template (one photo card per activity).
 *
 * Reference: Figma node 364:4960 (Instagram 1080×1350)
 *
 * Config keys:
 *   title         – Activity title (e.g., "Desert Buggy Ride")
 *   subtitle      – Description text
 *   locationBadge – Location overlay label (e.g., "Dubai")
 *   photo         – Single photo path
 *   logoPath      – Brand logo path
 *   website       – "www.raynatours.com"
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

export interface ExploreSlideConfig {
	title?: string              // Activity name shown on dark tag
	subtitle?: string           // Description below the title
	locationBadge?: string      // Overlay badge text (e.g., "Dubai")
	photo?: string              // Single photo path
	logoPath?: string
	website?: string
}

// ── PNG Helpers ───────────────────────────────────────────────

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

export async function renderExploreSlide(
	config: ExploreSlideConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width   // 1080
	const H = dims.height  // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	const title = config.title || 'Activity'
	const subtitle = config.subtitle || ''
	const locationBadge = config.locationBadge || ''
	const website = config.website || 'www.raynatours.com'

	// ═══════════════════════════════════════════════════════════
	// 1. Background gradient (same as explore-activities)
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
	// 3. Logo (top-left — Figma: 52, 52)
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

		ctx.save()
		Effects.roundedRectPath(ctx, bx, by, bw, bh, 12)
		ctx.fillStyle = '#ffffff'
		ctx.fill()
		ctx.strokeStyle = '#dedede'
		ctx.lineWidth = 2
		ctx.stroke()
		ctx.restore()

		// Globe icon
		const gx = bx + padX + iconSz / 2
		const gy = by + bh / 2
		const gr = iconSz / 2
		ctx.save()
		ctx.strokeStyle = '#444'
		ctx.lineWidth = 2.5
		ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke()
		ctx.beginPath(); ctx.moveTo(gx - gr, gy); ctx.lineTo(gx + gr, gy); ctx.stroke()
		ctx.beginPath(); ctx.moveTo(gx, gy - gr); ctx.lineTo(gx, gy + gr); ctx.stroke()
		ctx.restore()

		TextRenderer.draw(ctx, bx + padX + iconSz + gap, by + padY, website, {
			font: badgeFont, color: '#000000', align: 'left', baseline: 'top',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 5. Grey outer card border
	//    Figma: left:48, top:235, w:886, h:816
	//    border:9.612px #c9c9c9, r:18.364px
	// ═══════════════════════════════════════════════════════════
	ctx.save()
	Effects.roundedRectPath(ctx, 48, 235, 886, 816, 18.364)
	ctx.strokeStyle = '#c9c9c9'
	ctx.lineWidth = 9.612
	ctx.stroke()
	ctx.restore()

	// ═══════════════════════════════════════════════════════════
	// 6. White inner card with photo
	//    Figma: centered, top:204, w:910, padding:32
	//    bg:#f8f8f8, r:20.355px, shadow
	// ═══════════════════════════════════════════════════════════
	const cardX = (W - 910) / 2  // 85
	const cardY = 204
	const cardW = 910
	const cardPad = 32
	const photoW = 846  // cardW - cardPad*2
	const photoH = 742
	const photoR = 20.355
	const cardH = photoH + cardPad * 2  // 806

	// White card with shadow
	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,0.25)'
	ctx.shadowBlur = 32.451
	ctx.shadowOffsetX = 4.056
	ctx.shadowOffsetY = 6.085
	Effects.roundedRectPath(ctx, cardX, cardY, cardW, cardH, 20.355)
	ctx.fillStyle = '#f8f8f8'
	ctx.fill()
	ctx.restore()

	// Photo inside card
	const photoX = cardX + cardPad
	const photoY = cardY + cardPad

	if (config.photo) {
		try {
			const photo = await loadImage(config.photo)
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
			ctx.fillStyle = '#d9d9d9'
			Effects.roundedRectPath(ctx, photoX, photoY, photoW, photoH, photoR)
			ctx.fill()
			ctx.restore()
		}
	} else {
		ctx.save()
		ctx.fillStyle = '#d9d9d9'
		Effects.roundedRectPath(ctx, photoX, photoY, photoW, photoH, photoR)
		ctx.fill()
		ctx.restore()
	}

	// ═══════════════════════════════════════════════════════════
	// 7. Location badge overlay (top-left of photo)
	//    Figma: margin 32 from card edge, w:140, h:72
	//    bg:rgba(0,0,0,0.25), r:13.615px
	// ═══════════════════════════════════════════════════════════
	if (locationBadge) {
		const badgeX = photoX + 32
		const badgeY = photoY + 32
		const badgeFont = fontString('montserrat', 34, 600)
		const { width: lblW } = TextRenderer.measure(ctx, locationBadge, badgeFont)
		const bPadX = 22.692
		const bW = Math.max(140, lblW + bPadX * 2)
		const bH = 72

		ctx.save()
		Effects.roundedRectPath(ctx, badgeX, badgeY, bW, bH, 13.615)
		ctx.fillStyle = 'rgba(0,0,0,0.25)'
		ctx.fill()
		ctx.restore()

		TextRenderer.draw(ctx, badgeX + bW / 2, badgeY + bH / 2, locationBadge, {
			font: badgeFont,
			color: '#ffffff',
			align: 'center',
			baseline: 'middle',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 8. Bird decorations (real PNG, rotated)
	//    Left:  Figma (5, 1001), 236×167, rotate:-13.54°
	//    Right: Figma (849, 1099), 186×187, rotate:8.8°
	// ═══════════════════════════════════════════════════════════
	await drawRotatedPNG(ctx, BIRDS_PNG, 5 + 236 / 2, 1001 + 167 / 2, 236, 167, -13.54, 0.70)
	await drawRotatedPNG(ctx, BIRDS_PNG, 849 + 186 / 2, 1099 + 187 / 2, 186, 187, 8.8, 0.55)

	// ═══════════════════════════════════════════════════════════
	// 9. Bottom text section
	//    Figma: centered at x=540, top:1115, w:506, gap:32
	// ═══════════════════════════════════════════════════════════
	{
		const sectionCX = W / 2   // 540 — centered
		const sectionTop = 1115
		const sectionW = 506

		// ── Title tag (dark bg, bold white text) ──
		const titleFont = fontString('montserrat', 40, 800)
		const { width: titleW, height: titleH } = TextRenderer.measure(ctx, title, titleFont)
		const tPad = 24
		const tagW = Math.max(sectionW, titleW + tPad * 2)
		const tagH = titleH + tPad * 2
		const tagX = sectionCX - tagW / 2
		const tagY = sectionTop

		ctx.save()
		ctx.fillStyle = '#535353'
		ctx.fillRect(tagX, tagY, tagW, tagH)
		ctx.restore()

		TextRenderer.draw(ctx, sectionCX, tagY + tPad, title, {
			font: titleFont,
			color: '#edeeef',
			align: 'center',
			baseline: 'top',
		})

		// ── Subtitle (regular text, centered) ──
		if (subtitle) {
			const subY = tagY + tagH + 32  // 32px gap
			const subFont = preset('dm-sans', 28)
			const wrapped = TextRenderer.wordWrap(ctx, subtitle, subFont, sectionW)

			TextRenderer.drawMultiline(ctx, sectionCX, subY, wrapped, {
				font: subFont,
				color: '#000000',
				align: 'center',
				baseline: 'top',
				lineSpacing: 6,
			})
		}
	}

	// ── Export ─────────────────────────────────────────────────
	return canvas.encode('png')
}
