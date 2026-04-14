/**
 * Canvas Effects Engine
 * =====================
 * Gradients, overlays, shadows, rounded rects, boarding pass shapes.
 * Replaces Python engine/effects.py — using native Skia operations.
 */
import type { SKRSContext2D } from '@napi-rs/canvas'

// ── Gradient Effects ───────────────────────────────────────────────

export class Effects {

	/** Fill canvas with a vertical linear gradient */
	static linearGradient(
		ctx: SKRSContext2D,
		x: number, y: number, w: number, h: number,
		colors: Array<{ stop: number; color: string }>,
		direction: 'vertical' | 'horizontal' | 'diagonal' = 'vertical',
	): void {
		let grad: ReturnType<SKRSContext2D['createLinearGradient']>
		switch (direction) {
			case 'horizontal':
				grad = ctx.createLinearGradient(x, y, x + w, y)
				break
			case 'diagonal':
				grad = ctx.createLinearGradient(x, y, x + w, y + h)
				break
			default: // vertical
				grad = ctx.createLinearGradient(x, y, x, y + h)
		}
		for (const c of colors) {
			grad.addColorStop(c.stop, c.color)
		}
		ctx.fillStyle = grad
		ctx.fillRect(x, y, w, h)
	}

	/**
	 * Bottom-up gradient overlay for text readability on images.
	 * coverage: 0..1 fraction of the canvas height the gradient covers.
	 */
	static gradientOverlay(
		ctx: SKRSContext2D,
		w: number, h: number,
		options: {
			direction?: 'bottom_up' | 'top_down' | 'left_right'
			startColor?: string      // e.g. 'rgba(0,0,0,0.8)'
			endColor?: string        // e.g. 'rgba(0,0,0,0)'
			coverage?: number        // 0..1
		} = {},
	): void {
		const dir = options.direction || 'bottom_up'
		const start = options.startColor || 'rgba(0,0,0,0.78)'
		const end = options.endColor || 'rgba(0,0,0,0)'
		const coverage = options.coverage || 0.5

		let grad: ReturnType<SKRSContext2D['createLinearGradient']>
		switch (dir) {
			case 'top_down': {
				const gradH = Math.round(h * coverage)
				grad = ctx.createLinearGradient(0, 0, 0, gradH)
				grad.addColorStop(0, start)
				grad.addColorStop(1, end)
				ctx.fillStyle = grad
				ctx.fillRect(0, 0, w, gradH)
				break
			}
			case 'left_right': {
				const gradW = Math.round(w * coverage)
				grad = ctx.createLinearGradient(0, 0, gradW, 0)
				grad.addColorStop(0, start)
				grad.addColorStop(1, end)
				ctx.fillStyle = grad
				ctx.fillRect(0, 0, gradW, h)
				break
			}
			default: { // bottom_up
				const gradH = Math.round(h * coverage)
				const startY = h - gradH
				grad = ctx.createLinearGradient(0, h, 0, startY)
				grad.addColorStop(0, start)
				grad.addColorStop(1, end)
				ctx.fillStyle = grad
				ctx.fillRect(0, startY, w, gradH)
				break
			}
		}
	}

	/**
	 * Multiple gradient overlays stacked (like Python multi_gradient_overlay).
	 */
	static multiGradientOverlay(
		ctx: SKRSContext2D,
		w: number, h: number,
		overlays: Array<{
			direction?: 'bottom_up' | 'top_down' | 'left_right'
			startColor?: string
			endColor?: string
			coverage?: number
		}>,
	): void {
		for (const ov of overlays) {
			Effects.gradientOverlay(ctx, w, h, ov)
		}
	}

	// ── Shape Effects ──────────────────────────────────────────────

	/** Draw a rounded rectangle path (does NOT fill/stroke — caller decides) */
	static roundedRectPath(
		ctx: SKRSContext2D,
		x: number, y: number, w: number, h: number, r: number,
	): void {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.arcTo(x + w, y, x + w, y + r, r)
		ctx.lineTo(x + w, y + h - r)
		ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
		ctx.lineTo(x + r, y + h)
		ctx.arcTo(x, y + h, x, y + h - r, r)
		ctx.lineTo(x, y + r)
		ctx.arcTo(x, y, x + r, y, r)
		ctx.closePath()
	}

	/** Draw a filled rounded rectangle with optional shadow */
	static roundedRect(
		ctx: SKRSContext2D,
		x: number, y: number, w: number, h: number, r: number,
		fill: string,
		shadow?: { color: string; blur: number; offsetX: number; offsetY: number },
	): void {
		ctx.save()
		if (shadow) {
			ctx.shadowColor = shadow.color
			ctx.shadowBlur = shadow.blur
			ctx.shadowOffsetX = shadow.offsetX
			ctx.shadowOffsetY = shadow.offsetY
		}
		Effects.roundedRectPath(ctx, x, y, w, h, r)
		ctx.fillStyle = fill
		ctx.fill()
		ctx.restore()
	}

	/** Draw a circular badge/dot */
	static circle(
		ctx: SKRSContext2D,
		cx: number, cy: number, radius: number,
		fill: string,
		stroke?: { color: string; width: number },
	): void {
		ctx.beginPath()
		ctx.arc(cx, cy, radius, 0, Math.PI * 2)
		ctx.closePath()
		ctx.fillStyle = fill
		ctx.fill()
		if (stroke) {
			ctx.strokeStyle = stroke.color
			ctx.lineWidth = stroke.width
			ctx.stroke()
		}
	}

	// ── Boarding Pass Ticket Shape ─────────────────────────────────

	/**
	 * Draw a boarding-pass shaped ticket with notched edges.
	 * The notch is a semicircle cut from both sides (like a real ticket).
	 */
	static ticketShape(
		ctx: SKRSContext2D,
		x: number, y: number, w: number, h: number,
		options: {
			fill?: string
			cornerRadius?: number
			notchRadius?: number
			notchY?: number           // Y position of notch (fraction 0..1 of height)
			shadow?: { color: string; blur: number; offsetX: number; offsetY: number }
		} = {},
	): void {
		const cr = options.cornerRadius || 12
		const nr = options.notchRadius || 14
		const notchFrac = options.notchY || 0.28
		const notchCenterY = y + h * notchFrac

		ctx.save()

		if (options.shadow) {
			ctx.shadowColor = options.shadow.color
			ctx.shadowBlur = options.shadow.blur
			ctx.shadowOffsetX = options.shadow.offsetX
			ctx.shadowOffsetY = options.shadow.offsetY
		}

		ctx.beginPath()

		// Top-left corner
		ctx.moveTo(x + cr, y)
		// Top edge
		ctx.lineTo(x + w - cr, y)
		// Top-right corner
		ctx.arcTo(x + w, y, x + w, y + cr, cr)
		// Right edge down to notch
		ctx.lineTo(x + w, notchCenterY - nr)
		// Right notch (semicircle inward)
		ctx.arc(x + w, notchCenterY, nr, -Math.PI / 2, Math.PI / 2, true)
		// Right edge from notch to bottom
		ctx.lineTo(x + w, y + h - cr)
		// Bottom-right corner
		ctx.arcTo(x + w, y + h, x + w - cr, y + h, cr)
		// Bottom edge
		ctx.lineTo(x + cr, y + h)
		// Bottom-left corner
		ctx.arcTo(x, y + h, x, y + h - cr, cr)
		// Left edge from bottom to notch
		ctx.lineTo(x, notchCenterY + nr)
		// Left notch (semicircle inward)
		ctx.arc(x, notchCenterY, nr, Math.PI / 2, -Math.PI / 2, true)
		// Left edge from notch to top
		ctx.lineTo(x, y + cr)
		// Top-left corner
		ctx.arcTo(x, y, x + cr, y, cr)

		ctx.closePath()
		ctx.fillStyle = options.fill || '#FFFFF0'
		ctx.fill()

		ctx.restore()
	}

	/** Draw a dashed line (for ticket tear line) */
	static dashedLine(
		ctx: SKRSContext2D,
		x1: number, y1: number, x2: number, y2: number,
		color: string = 'rgba(150,150,150,0.5)',
		dashPattern: number[] = [6, 4],
		lineWidth: number = 1,
	): void {
		ctx.save()
		ctx.setLineDash(dashPattern)
		ctx.strokeStyle = color
		ctx.lineWidth = lineWidth
		ctx.beginPath()
		ctx.moveTo(x1, y1)
		ctx.lineTo(x2, y2)
		ctx.stroke()
		ctx.restore()
	}

	/** Draw a barcode-style decoration (decorative, not scannable) */
	static barcode(
		ctx: SKRSContext2D,
		x: number, y: number, w: number, h: number,
		color: string = '#000000',
	): void {
		ctx.save()
		ctx.fillStyle = color

		// Pseudo-random bar pattern
		const pattern = [3,1,2,1,3,2,1,1,3,1,2,2,1,3,1,1,2,3,1,2,1,1,3,2,1,3,1,2,1,1,2,3,1,2,3,1,1,2,1,3]
		let currentX = x
		let isBar = true

		for (const barWidth of pattern) {
			const bw = (barWidth / 2) * (w / 60)
			if (isBar) {
				ctx.fillRect(currentX, y, bw, h)
			}
			currentX += bw
			if (currentX > x + w) break
			isBar = !isBar
		}

		ctx.restore()
	}

	// ── Photo Frame with Paperclip ─────────────────────────────────

	/**
	 * Draw a white-bordered photo frame with a paperclip decoration.
	 * The frame can be rotated. If no image is loaded, draws a placeholder.
	 */
	static photoFrame(
		ctx: SKRSContext2D,
		x: number, y: number,
		w: number, h: number,
		options: {
			rotation?: number        // degrees
			borderWidth?: number
			borderColor?: string
			shadow?: { color: string; blur: number; offsetX: number; offsetY: number }
			paperclipSide?: 'top-left' | 'top-right' | 'none'
			paperclipColor?: string
		} = {},
	): void {
		const rot = (options.rotation || 0) * Math.PI / 180
		const border = options.borderWidth || 10
		const totalW = w + border * 2
		const totalH = h + border * 2

		ctx.save()

		// Translate to center, rotate
		const cx = x + totalW / 2
		const cy = y + totalH / 2
		ctx.translate(cx, cy)
		ctx.rotate(rot)

		// Shadow
		if (options.shadow) {
			ctx.shadowColor = options.shadow.color
			ctx.shadowBlur = options.shadow.blur
			ctx.shadowOffsetX = options.shadow.offsetX
			ctx.shadowOffsetY = options.shadow.offsetY
		}

		// White border frame
		Effects.roundedRectPath(ctx, -totalW / 2, -totalH / 2, totalW, totalH, 6)
		ctx.fillStyle = options.borderColor || '#FFFFFF'
		ctx.fill()

		// Clear shadow for inner content
		ctx.shadowColor = 'transparent'

		// Inner photo area (grey placeholder if no image drawn by caller)
		ctx.fillStyle = '#D0D8E0'
		ctx.fillRect(-w / 2, -h / 2, w, h)

		// Paperclip decoration
		if (options.paperclipSide !== 'none') {
			const clipColor = options.paperclipColor || '#2C3E50'
			const side = options.paperclipSide || 'top-left'
			const clipX = side === 'top-left' ? -totalW / 2 + totalW * 0.15 : totalW / 2 - totalW * 0.15
			const clipY = -totalH / 2

			ctx.strokeStyle = clipColor
			ctx.lineWidth = 3
			ctx.lineCap = 'round'

			// Paperclip shape: elongated U-clip
			const clipW = 22
			const clipH = 50
			const clipR = clipW / 2

			ctx.beginPath()
			// Outer loop
			ctx.moveTo(clipX - clipW / 2, clipY + clipH * 0.3)
			ctx.lineTo(clipX - clipW / 2, clipY - clipH * 0.3)
			ctx.arc(clipX, clipY - clipH * 0.3, clipR, Math.PI, 0)
			ctx.lineTo(clipX + clipW / 2, clipY + clipH * 0.5)
			ctx.arc(clipX, clipY + clipH * 0.5, clipR, 0, Math.PI)
			ctx.lineTo(clipX - clipW / 2 + 6, clipY - clipH * 0.15)
			ctx.arc(clipX, clipY - clipH * 0.15, clipR - 6, Math.PI, 0)
			ctx.lineTo(clipX + clipW / 2 - 6, clipY + clipH * 0.3)
			ctx.stroke()
		}

		ctx.restore()
	}

	// ── Airplane Silhouette (decorative) ───────────────────────────

	static airplaneIcon(
		ctx: SKRSContext2D,
		cx: number, cy: number,
		size: number,
		color: string = 'rgba(255,255,255,0.12)',
		rotation: number = -30,
	): void {
		ctx.save()
		ctx.translate(cx, cy)
		ctx.rotate(rotation * Math.PI / 180)

		ctx.fillStyle = color
		ctx.font = `${size}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('\u2708', 0, 0)

		ctx.restore()
	}
}
