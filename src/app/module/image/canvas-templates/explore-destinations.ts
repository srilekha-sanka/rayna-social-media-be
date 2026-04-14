/**
 * Template: Explore Destinations (Carousel Cover)
 * ================================================
 * Blue sky gradient background with white cloud decorations, bird
 * silhouettes, three tall destination photo cards, a tilted plane
 * image, and a blue gradient CTA pill.
 * Designed as the first page of an Instagram carousel.
 *
 * Reference: Figma node 333:3453 — "Instagram post - 2" (1080×1350)
 *
 * Background: Blue-to-white vertical gradient (#2284db → #5394cf → white)
 * with cloud.png decorations scattered to create a sky effect.
 * NO product photo is used as background — only gradient + clouds.
 *
 * Config keys:
 *   headlineText   – CTA pill text (default: "Explore. Experience. Enjoy.")
 *   photos         – [path1, path2, path3] (three destination card photos)
 *   cardLabels     – [{title, subtitle}, ...] per card
 *   logoPath       – Brand logo path
 *   website        – "www.raynatours.com"
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
const PLANE_PNG = path.join(ASSETS_DIR, 'unsplash_TWBkfxTQin8.png')

// ── Config (Cover) ────────────────────────────────────────────

export interface ExploreDestinationsConfig {
	headlineText?: string           // CTA pill text
	photos?: string[]               // 3 destination card photos
	cardLabels?: Array<{
		title: string
		subtitle: string
	}>
	logoPath?: string
	website?: string
}

// ── Config (Slide) ────────────────────────────────────────────

export interface ExploreDestinationSlideConfig {
	title?: string                  // Destination name shown on pill (e.g., "Bali")
	activities?: string[]           // Activity labels (e.g., ["XYZ Temple", "Waterfall", "Adventure Sports"])
	photo?: string                  // Single photo path
	logoPath?: string
	website?: string
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

// ── Card Definition ──────────────────────────────────────────

interface CardDef {
	x: number        // absolute left in 1080px frame
	y: number        // absolute top
	w: number
	h: number
	radius: number
}

// Figma coords (full scale 1080×1350):
// Container: left:112, top:193 (from Figma: left:56*2=112, top:96.5*2=193)
// Card 1: w:270, h:849, left:0   → abs left:112
// Card 2: w:270, h:821, left:293 → abs left:405
// Card 3: w:270, h:762, left:586 → abs left:698
const CARDS: CardDef[] = [
	{ x: 112, y: 193, w: 270, h: 849, radius: 24 },
	{ x: 405, y: 193, w: 270, h: 821, radius: 24 },
	{ x: 698, y: 193, w: 270, h: 762, radius: 24 },
]

const DEFAULT_LABELS = [
	{ title: 'Destination 1', subtitle: 'Country' },
	{ title: 'Destination 2', subtitle: 'Country' },
	{ title: 'Destination 3', subtitle: 'Country' },
]

// ── Draw a single destination card ───────────────────────────

async function drawDestinationCard(
	ctx: SKRSContext2D,
	card: CardDef,
	photoPath: string | undefined,
	label: { title: string; subtitle: string },
): Promise<void> {
	const { x, y, w, h, radius } = card

	// ── 1. Photo (cover-cropped into rounded rect) ──
	ctx.save()
	Effects.roundedRectPath(ctx, x, y, w, h, radius)
	ctx.clip()

	if (photoPath) {
		try {
			const buf = fs.readFileSync(photoPath)
			const photo = await loadImage(buf)
			const imgRatio = photo.width / photo.height
			const frameRatio = w / h
			let dw: number, dh: number
			if (imgRatio > frameRatio) {
				dh = h
				dw = h * imgRatio
			} else {
				dw = w
				dh = w / imgRatio
			}
			const dx = x + (w - dw) / 2
			const dy = y + (h - dh) / 2
			ctx.drawImage(photo, dx, dy, dw, dh)
		} catch {
			// Fallback gradient placeholder
			const grad = ctx.createLinearGradient(x, y, x, y + h)
			grad.addColorStop(0, '#4a9fbb')
			grad.addColorStop(0.5, '#3d7a35')
			grad.addColorStop(1, '#2d5e28')
			ctx.fillStyle = grad
			ctx.fillRect(x, y, w, h)
		}
	} else {
		// Placeholder gradient
		const grad = ctx.createLinearGradient(x, y, x, y + h)
		grad.addColorStop(0, '#5b9ad6')
		grad.addColorStop(0.5, '#4a7e48')
		grad.addColorStop(1, '#3a6040')
		ctx.fillStyle = grad
		ctx.fillRect(x, y, w, h)
	}
	ctx.restore()

	// ── 2. Title text (DM Sans SemiBold 28px, top:28 from card top) ──
	// Figma: centered horizontally in card, white, nowrap
	const titleFont = fontString('dm-sans-bold', 28, 700)
	const titleY = y + 28

	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,0.5)'
	ctx.shadowBlur = 4
	ctx.shadowOffsetX = 1
	ctx.shadowOffsetY = 1
	TextRenderer.draw(ctx, x + w / 2, titleY, label.title, {
		font: titleFont, color: '#ffffff', align: 'center', baseline: 'top',
	})
	ctx.restore()

	// ── 3. Subtitle text (DM Sans Regular 20px, top:63 from card top) ──
	const subFont = fontString('dm-sans', 20, 400)
	const subY = y + 63

	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,0.5)'
	ctx.shadowBlur = 4
	ctx.shadowOffsetX = 1
	ctx.shadowOffsetY = 1
	TextRenderer.draw(ctx, x + w / 2, subY, label.subtitle, {
		font: subFont, color: '#ffffff', align: 'center', baseline: 'top',
	})
	ctx.restore()
}

// ── Shared: draw the blue sky background (gradient + clouds) ─

async function drawSkyBackground(ctx: SKRSContext2D, W: number, H: number): Promise<void> {
	// White base
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// Blue sky → white gradient (Figma: h:860)
	Effects.linearGradient(ctx, 0, 0, W, 860, [
		{ stop: 0, color: '#2284db' },
		{ stop: 0.6346, color: '#5394cf' },
		{ stop: 1, color: '#ffffff' },
	])

	// Cloud decorations scattered across the sky
	await drawPNG(ctx, CLOUD_PNG, -100, -30, 520, 280, 0.92)
	await drawPNG(ctx, CLOUD_PNG, 620, -40, 500, 260, 0.88)
	await drawPNG(ctx, CLOUD_PNG, 280, 100, 460, 240, 0.75)
	await drawPNG(ctx, CLOUD_PNG, -60, 300, 440, 230, 0.70)
	await drawPNG(ctx, CLOUD_PNG, 700, 250, 420, 220, 0.65)
	await drawPNG(ctx, CLOUD_PNG, 200, 500, 500, 250, 0.55)
	await drawPNG(ctx, CLOUD_PNG, -40, 650, 400, 200, 0.50)
	await drawPNG(ctx, CLOUD_PNG, 680, 600, 440, 220, 0.45)
	await drawPNG(ctx, CLOUD_PNG, 100, 800, 480, 240, 0.35)
	await drawPNG(ctx, CLOUD_PNG, 600, 850, 400, 200, 0.30)
}

// ── Shared: draw logo ────────────────────────────────────────

async function drawLogo(ctx: SKRSContext2D, logoPath?: string): Promise<void> {
	if (logoPath) {
		await Components.placeLogo(ctx, logoPath, 38, 34, 227, 93)
	} else {
		ctx.save()
		ctx.font = preset('playlist', 48)
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#ffffff'
		ctx.fillText('Rayna', 38, 34)
		const rw = ctx.measureText('Rayna').width
		ctx.font = preset('montserrat', 13)
		ctx.fillStyle = 'rgba(255,255,255,0.85)'
		ctx.fillText('tours', 38 + rw + 4, 62)
		ctx.restore()
	}
}

// ── Shared: draw bird silhouettes ────────────────────────────

async function drawBirds(ctx: SKRSContext2D): Promise<void> {
	// Left: Figma (5, 1001), 236×167, rotate:-13.54deg
	await drawRotatedPNG(ctx, BIRDS_PNG, 5 + 236 / 2, 1001 + 167 / 2, 236, 167, -13.54, 0.70)
	// Right: Figma (849, 1209), 186×187, rotate:8.8deg
	await drawRotatedPNG(ctx, BIRDS_PNG, 849 + 186 / 2, 1209 + 187 / 2, 186, 187, 8.8, 0.55)
}

// ── Shared: draw blue gradient pill with text ────────────────

function drawBluePill(
	ctx: SKRSContext2D,
	x: number, y: number, w: number, h: number,
	text: string, fontSize: number,
): void {
	const r = 24

	ctx.save()
	Effects.roundedRectPath(ctx, x, y, w, h, r)
	ctx.clip()

	// Solid blue gradient base
	const baseGrad = ctx.createLinearGradient(x, y, x + w, y)
	baseGrad.addColorStop(0, '#1c7ccf')
	baseGrad.addColorStop(1, '#477ef1')
	ctx.fillStyle = baseGrad
	ctx.fillRect(x, y, w, h)

	// Semi-transparent gradient overlay
	const overlayGrad = ctx.createLinearGradient(x, y, x + w, y)
	overlayGrad.addColorStop(0.16, 'rgba(28,124,207,0.70)')
	overlayGrad.addColorStop(0.97, 'rgba(71,126,241,0.70)')
	ctx.fillStyle = overlayGrad
	ctx.fillRect(x, y, w, h)

	ctx.restore()

	// Text (Dela Gothic One, white, centered)
	const ctaFont = preset('dela-gothic', fontSize)
	TextRenderer.draw(ctx, x + w / 2, y + h / 2, text, {
		font: ctaFont, color: '#ffffff', align: 'center', baseline: 'middle',
	})
}

// ══════════════════════════════════════════════════════════════
// COVER: renderExploreDestinations (Slide 1 — 3 cards + plane)
// ══════════════════════════════════════════════════════════════

export async function renderExploreDestinations(
	config: ExploreDestinationsConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width   // 1080
	const H = dims.height  // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	const headlineText = config.headlineText || 'Explore. Experience. Enjoy.'
	const labels = config.cardLabels || DEFAULT_LABELS

	// 1. Sky background (gradient + clouds)
	await drawSkyBackground(ctx, W, H)

	// 2. Logo (top-left)
	await drawLogo(ctx, config.logoPath)

	// 3. Three destination photo cards
	for (let i = 0; i < CARDS.length; i++) {
		await drawDestinationCard(
			ctx, CARDS[i], config.photos?.[i],
			labels[i] || DEFAULT_LABELS[i % DEFAULT_LABELS.length],
		)
	}

	// 4. Plane image (tilted)
	//    Figma (333:3470): outer left:-61.62, top:778.65, w:1135.914, h:368.119
	//    Inner rotated -2.26deg, w:1124, h:324, opacity:0.96
	try {
		const planeBuf = fs.readFileSync(PLANE_PNG)
		const planeImg = await loadImage(planeBuf)
		const planeCX = -61.62 + 1135.914 / 2
		const planeCY = 778.65 + 368.119 / 2
		const planeW = 1124, planeH = 324

		ctx.save()
		ctx.globalAlpha = 0.96
		ctx.translate(planeCX, planeCY)
		ctx.rotate(-2.26 * Math.PI / 180)
		Effects.roundedRectPath(ctx, -planeW / 2, -planeH / 2, planeW, planeH, 0)
		ctx.clip()
		const imgRatio = planeImg.width / planeImg.height
		const frameRatio = planeW / planeH
		let dw: number, dh: number
		if (imgRatio > frameRatio) { dh = planeH; dw = planeH * imgRatio }
		else { dw = planeW; dh = planeW / imgRatio }
		ctx.drawImage(planeImg, -dw / 2, -dh / 2, dw, dh)
		ctx.restore()
	} catch { /* skip */ }

	// 5. Bird silhouettes
	await drawBirds(ctx)

	// 6. Blue gradient CTA pill
	//    Figma (333:3471): left:123, top:1165, w:819, h:108
	drawBluePill(ctx, 123, 1165, 819, 108, headlineText, 44)

	return canvas.encode('png')
}

// ══════════════════════════════════════════════════════════════
// SLIDE: renderExploreDestinationSlide (Slides 2+ — single photo)
// ══════════════════════════════════════════════════════════════
//
// Reference: Figma node 340:4274 — "Instagram post - 19" (1080×1350)
//
// Layout (full scale 1080×1350):
//   - Same blue sky gradient + clouds background
//   - Logo top-left
//   - Large square photo card: centered, top:193, 832×832, border:3px white, r:32
//   - Bird silhouettes (same positions)
//   - Bottom section at top:1073, centered, w:819:
//     - Destination pill: blue gradient, Dela Gothic One 44px
//     - Activities row: DM Sans Regular 28px, #434343, dividers #b1b1b1

export async function renderExploreDestinationSlide(
	config: ExploreDestinationSlideConfig,
	dims: Dimensions = INSTAGRAM['4:5'],
): Promise<Buffer> {
	const W = dims.width   // 1080
	const H = dims.height  // 1350
	const { canvas, ctx } = createTemplateCanvas(dims)

	const title = config.title || 'Destination'
	const activities = config.activities || []

	// ═══════════════════════════════════════════════════════════
	// 1. Sky background (gradient + clouds) — same as cover
	// ═══════════════════════════════════════════════════════════
	await drawSkyBackground(ctx, W, H)

	// ═══════════════════════════════════════════════════════════
	// 2. Logo (top-left) — same position as cover
	// ═══════════════════════════════════════════════════════════
	await drawLogo(ctx, config.logoPath)

	// ═══════════════════════════════════════════════════════════
	// 3. Large square photo card
	//    Figma (340:4280): centered, top:193, size:832×832
	//    border: 3px solid white, border-radius: 32px
	//    bg: #d9d9d9 (placeholder)
	// ═══════════════════════════════════════════════════════════
	{
		const cardSize = 832
		const cardX = (W - cardSize) / 2   // 124
		const cardY = 193
		const cardR = 32
		const borderW = 3

		// White border frame
		ctx.save()
		ctx.shadowColor = 'rgba(0,0,0,0.15)'
		ctx.shadowBlur = 12
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 4
		Effects.roundedRectPath(ctx, cardX, cardY, cardSize, cardSize, cardR)
		ctx.fillStyle = '#ffffff'
		ctx.fill()
		ctx.restore()

		// Photo area (inset by border width)
		const photoX = cardX + borderW
		const photoY = cardY + borderW
		const photoSize = cardSize - borderW * 2
		const photoR = cardR - borderW

		if (config.photo) {
			try {
				const buf = fs.readFileSync(config.photo)
				const photo = await loadImage(buf)
				ctx.save()
				Effects.roundedRectPath(ctx, photoX, photoY, photoSize, photoSize, photoR)
				ctx.clip()

				// Cover-crop
				const imgRatio = photo.width / photo.height
				let dw: number, dh: number
				if (imgRatio > 1) {
					dh = photoSize
					dw = photoSize * imgRatio
				} else {
					dw = photoSize
					dh = photoSize / imgRatio
				}
				const dx = photoX + (photoSize - dw) / 2
				const dy = photoY + (photoSize - dh) / 2
				ctx.drawImage(photo, dx, dy, dw, dh)
				ctx.restore()
			} catch {
				ctx.save()
				Effects.roundedRectPath(ctx, photoX, photoY, photoSize, photoSize, photoR)
				ctx.fillStyle = '#d9d9d9'
				ctx.fill()
				ctx.restore()
			}
		} else {
			ctx.save()
			Effects.roundedRectPath(ctx, photoX, photoY, photoSize, photoSize, photoR)
			ctx.fillStyle = '#d9d9d9'
			ctx.fill()
			ctx.restore()
		}
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Bird silhouettes — same positions as cover
	// ═══════════════════════════════════════════════════════════
	await drawBirds(ctx)

	// ═══════════════════════════════════════════════════════════
	// 5. Bottom section
	//    Figma (340:4283): centered, top:1073, w:819
	//    flex-col, gap:32, items-center
	// ═══════════════════════════════════════════════════════════
	{
		const sectionCX = W / 2        // 540
		const sectionTop = 1073
		const gap = 32

		// ── 5a. Destination name pill ──
		// Figma (340:4284): blue gradient, Dela Gothic One 44px
		// padding: py:24, pl:67, pr:53 → auto-width based on text
		const pillFont = preset('dela-gothic', 44)
		const { width: pillTextW } = TextRenderer.measure(ctx, title, pillFont)
		const pillPadL = 67, pillPadR = 53, pillPadY = 24
		const pillW = pillPadL + pillTextW + pillPadR
		const pillH = pillPadY * 2 + 44 * 1.1  // text height ~48
		const pillX = sectionCX - pillW / 2
		const pillY = sectionTop

		drawBluePill(ctx, pillX, pillY, pillW, pillH, title, 44)

		// ── 5b. Activities row ──
		// Figma (348:4812): flex, gap:24, DM Sans Regular 28px, #434343
		// Dividers: #b1b1b1, h:24, w:1px
		if (activities.length > 0) {
			const actFont = fontString('dm-sans', 28, 400)
			const actColor = '#434343'
			const divColor = '#b1b1b1'
			const actGap = 24
			const divH = 24

			// Measure total width
			let totalW = 0
			const actWidths: number[] = []
			for (let i = 0; i < activities.length; i++) {
				const { width: aw } = TextRenderer.measure(ctx, activities[i], actFont)
				actWidths.push(aw)
				totalW += aw
				if (i < activities.length - 1) totalW += actGap + 1 + actGap // gap + divider + gap
			}

			const rowY = pillY + pillH + gap
			let curX = sectionCX - totalW / 2

			for (let i = 0; i < activities.length; i++) {
				// Activity label
				TextRenderer.draw(ctx, curX, rowY, activities[i], {
					font: actFont, color: actColor, align: 'left', baseline: 'top',
				})
				curX += actWidths[i]

				// Divider (between items only)
				if (i < activities.length - 1) {
					curX += actGap
					ctx.save()
					ctx.fillStyle = divColor
					// Vertically center the divider with the text (~28px line height)
					ctx.fillRect(curX, rowY + (28 * 1.5 - divH) / 2, 1, divH)
					ctx.restore()
					curX += 1 + actGap
				}
			}
		}
	}

	return canvas.encode('png')
}
