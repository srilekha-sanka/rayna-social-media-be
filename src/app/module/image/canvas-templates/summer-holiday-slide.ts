/**
 * Template: Summer Holiday Slide (Carousel Item)
 * ================================================
 * White background with logo + website pill header, bold title
 * & subtitle, a 2×2 activity grid (each cell: photo + gradient
 * overlay + country/activity label), and decorative bird silhouettes.
 *
 * Paired with the `summer-holiday` cover template.
 *
 * Reference: Figma — "Instagram post - 47 · Activities" (1080×1350)
 *
 * Config keys:
 *   title       – Category heading (e.g., "Activities")
 *   subtitle    – Sub heading (e.g., "Explore the Best Activities")
 *   photos      – Up to 4 photo paths for the grid cells
 *   labels      – Up to 4 labels for each cell (e.g., ["Thailand","Australia","Bali","Vietnam"])
 *   logoPath    – Brand logo path
 *   website     – "www.raynatours.com"
 *   titleColor  – Heading text color (default: '#596d89')
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

export interface SummerHolidaySlideConfig {
	title?: string          // "Activities"
	subtitle?: string       // "Explore the Best Activities"
	photos?: string[]       // up to 4 photos for the 2×2 grid
	labels?: string[]       // up to 4 labels (e.g., ["Thailand","Australia","Bali","Vietnam"])
	logoPath?: string
	website?: string
	titleColor?: string     // default: '#596d89'
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
	} catch { /* skip */ }
}

// ── Globe icon for website pill ──────────────────────────────

function drawGlobeIcon(
	ctx: SKRSContext2D,
	cx: number, cy: number,
	size: number,
): void {
	const r = size / 2
	ctx.save()
	ctx.strokeStyle = '#555555'
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
	ctx.moveTo(cx - r + 1, cy - r * 0.36)
	ctx.lineTo(cx + r - 1, cy - r * 0.36)
	ctx.stroke()

	ctx.beginPath()
	ctx.moveTo(cx - r + 1, cy + r * 0.36)
	ctx.lineTo(cx + r - 1, cy + r * 0.36)
	ctx.stroke()

	ctx.beginPath()
	ctx.moveTo(cx, cy - r)
	ctx.lineTo(cx, cy + r)
	ctx.stroke()

	ctx.restore()
}

// ── Grid cell definitions ────────────────────────────────────

interface GridCellDef {
	x: number
	y: number
	w: number
	h: number
	photoH: number
	// Which corners are rounded (outer corner of the 2×2 grid)
	corners: { tl: number; tr: number; bl: number; br: number }
}

// Grid: left:74, top:431, width:932
// Each cell: 466×414, border:1px solid black, padding:12
// Photo: 442 wide, top cells h:389, bottom cells h:390, radius:12
const GRID_X = 74
const GRID_Y = 431
const CELL_W = 466
const CELL_H = 414
const CELL_PAD = 12
const PHOTO_W = 442
const PHOTO_R = 12
const OUTER_R = 16

const GRID_CELLS: GridCellDef[] = [
	// Top-left
	{ x: GRID_X, y: GRID_Y, w: CELL_W, h: CELL_H, photoH: 389,
	  corners: { tl: OUTER_R, tr: 0, bl: 0, br: 0 } },
	// Top-right
	{ x: GRID_X + CELL_W, y: GRID_Y, w: CELL_W, h: CELL_H, photoH: 390,
	  corners: { tl: 0, tr: OUTER_R, bl: 0, br: 0 } },
	// Bottom-left
	{ x: GRID_X, y: GRID_Y + CELL_H, w: CELL_W, h: CELL_H, photoH: 390,
	  corners: { tl: 0, tr: 0, bl: OUTER_R, br: 0 } },
	// Bottom-right
	{ x: GRID_X + CELL_W, y: GRID_Y + CELL_H, w: CELL_W, h: CELL_H, photoH: 390,
	  corners: { tl: 0, tr: 0, bl: 0, br: OUTER_R } },
]

// ── Draw rounded rect path with per-corner radii ────────────

function roundedRectPathCorners(
	ctx: SKRSContext2D,
	x: number, y: number, w: number, h: number,
	corners: { tl: number; tr: number; bl: number; br: number },
): void {
	const { tl, tr, bl, br } = corners
	ctx.beginPath()
	ctx.moveTo(x + tl, y)
	ctx.lineTo(x + w - tr, y)
	if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr)
	else ctx.lineTo(x + w, y)
	ctx.lineTo(x + w, y + h - br)
	if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
	else ctx.lineTo(x + w, y + h)
	ctx.lineTo(x + bl, y + h)
	if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl)
	else ctx.lineTo(x, y + h)
	ctx.lineTo(x, y + tl)
	if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl)
	else ctx.lineTo(x, y)
	ctx.closePath()
}

// ── Draw a single grid cell ─────────────────────────────────

async function drawGridCell(
	ctx: SKRSContext2D,
	cell: GridCellDef,
	photoPath?: string,
	label?: string,
): Promise<void> {
	// Cell border
	ctx.save()
	roundedRectPathCorners(ctx, cell.x, cell.y, cell.w, cell.h, cell.corners)
	ctx.strokeStyle = '#000000'
	ctx.lineWidth = 1
	ctx.stroke()
	ctx.restore()

	// Photo area
	const photoX = cell.x + CELL_PAD
	const photoY = cell.y + CELL_PAD

	if (photoPath) {
		try {
			const buf = fs.readFileSync(photoPath)
			const img = await loadImage(buf)
			ctx.save()
			Effects.roundedRectPath(ctx, photoX, photoY, PHOTO_W, cell.photoH, PHOTO_R)
			ctx.clip()

			// Cover-crop
			const imgRatio = img.width / img.height
			const frameRatio = PHOTO_W / cell.photoH
			let dw: number, dh: number
			if (imgRatio > frameRatio) {
				dh = cell.photoH
				dw = cell.photoH * imgRatio
			} else {
				dw = PHOTO_W
				dh = PHOTO_W / imgRatio
			}
			ctx.drawImage(img, photoX + (PHOTO_W - dw) / 2, photoY + (cell.photoH - dh) / 2, dw, dh)
			ctx.restore()
		} catch {
			ctx.save()
			Effects.roundedRectPath(ctx, photoX, photoY, PHOTO_W, cell.photoH, PHOTO_R)
			ctx.fillStyle = '#d9d9d9'
			ctx.fill()
			ctx.restore()
		}
	} else {
		ctx.save()
		Effects.roundedRectPath(ctx, photoX, photoY, PHOTO_W, cell.photoH, PHOTO_R)
		ctx.fillStyle = '#d9d9d9'
		ctx.fill()
		ctx.restore()
	}

	// Gradient overlay (bottom portion of photo)
	// Height: 187.519, starts at photoY + 202
	{
		const gradH = 188
		const gradY = photoY + cell.photoH - gradH

		ctx.save()
		// Clip to bottom of photo with rounded bottom corners
		ctx.beginPath()
		ctx.moveTo(photoX, gradY)
		ctx.lineTo(photoX + PHOTO_W, gradY)
		ctx.lineTo(photoX + PHOTO_W, photoY + cell.photoH - PHOTO_R)
		ctx.arcTo(photoX + PHOTO_W, photoY + cell.photoH, photoX + PHOTO_W - PHOTO_R, photoY + cell.photoH, PHOTO_R)
		ctx.lineTo(photoX + PHOTO_R, photoY + cell.photoH)
		ctx.arcTo(photoX, photoY + cell.photoH, photoX, photoY + cell.photoH - PHOTO_R, PHOTO_R)
		ctx.lineTo(photoX, gradY)
		ctx.closePath()
		ctx.clip()

		const grad = ctx.createLinearGradient(photoX, gradY, photoX, gradY + gradH)
		grad.addColorStop(0, 'rgba(0,0,0,0)')
		grad.addColorStop(0.7154, '#3a3a3a')
		ctx.fillStyle = grad
		ctx.fillRect(photoX, gradY, PHOTO_W, gradH)
		ctx.restore()
	}

	// Label text (bold 44px white, centered horizontally in cell)
	if (label) {
		const labelFont = fontString('dm-sans-bold', 44, 700)
		const labelY = cell.y + cell.h - 50

		TextRenderer.draw(ctx, cell.x + cell.w / 2, labelY, label, {
			font: labelFont,
			color: '#ffffff',
			align: 'center',
			baseline: 'bottom',
		})
	}
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
	const subtitle = config.subtitle || 'Explore the Best Activities'
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
			font: pillFont,
			color: '#000000',
			align: 'left',
			baseline: 'middle',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 3. Title + subtitle text block
	//    HTML: left:212, top:224, w:657, centered
	//    title: 64px bold #596d89
	//    subtitle: 32px regular #596d89
	// ═══════════════════════════════════════════════════════════
	{
		const blockCX = W / 2
		const blockTop = 224

		const titleFont = fontString('dm-sans-bold', 64, 700)
		TextRenderer.draw(ctx, blockCX, blockTop, title, {
			font: titleFont,
			color: titleColor,
			align: 'center',
			baseline: 'top',
		})

		const { height: titleH } = TextRenderer.measure(ctx, title, titleFont)
		const subY = blockTop + titleH + 12
		const subFont = fontString('dm-sans', 32, 400)

		// Auto-fit if too wide
		const maxSubW = 657
		const { width: subW } = TextRenderer.measure(ctx, subtitle, subFont)
		let finalSubFont = subFont
		if (subW > maxSubW) {
			const scale = maxSubW / subW
			finalSubFont = fontString('dm-sans', Math.floor(32 * scale), 400)
		}

		TextRenderer.draw(ctx, blockCX, subY, subtitle, {
			font: finalSubFont,
			color: titleColor,
			align: 'center',
			baseline: 'top',
		})
	}

	// ═══════════════════════════════════════════════════════════
	// 4. Bird silhouette decorations (birds.png asset)
	//    Top-left:    left:12,  top:293,  rotate:-13.54deg
	//    Right:       left:893, top:650,  rotate:8.8deg
	//    Bottom-left: left:112, top:1172, rotate:36.94deg
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
	// 5. 2×2 Activity grid
	//    HTML: left:74, top:431, width:932
	//    4 cells (466×414 each), border:1px black
	//    Each cell: photo (442 wide) + gradient + label
	// ═══════════════════════════════════════════════════════════
	const photos = config.photos || []
	const labels = config.labels || []

	for (let i = 0; i < GRID_CELLS.length; i++) {
		await drawGridCell(ctx, GRID_CELLS[i], photos[i], labels[i])
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Small vector dot at bottom center
	//    HTML: left:593.85, top:1346.29, 3.6×2.9, #596d89
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
