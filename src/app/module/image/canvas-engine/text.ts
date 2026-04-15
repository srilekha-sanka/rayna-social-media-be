/**
 * Canvas Text Renderer
 * ====================
 * Text rendering with shadows, outlines, auto-sizing, word wrap.
 * Replaces Python engine/text.py — but uses Skia's native capabilities.
 */
import type { SKRSContext2D } from '@napi-rs/canvas'
import { preset, parseColor } from './core'

// ── Types ──────────────────────────────────────────────────────────

export interface ShadowConfig {
	offsetX: number
	offsetY: number
	blur: number
	color: string      // CSS color
}

export interface OutlineConfig {
	width: number
	color: string
}

export interface DrawTextOptions {
	font: string                       // CSS font string (e.g. '900 48px Montserrat')
	color?: string
	align?: 'left' | 'center' | 'right' | 'start' | 'end'
	baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic'
	shadow?: ShadowConfig
	outline?: OutlineConfig
	maxWidth?: number                  // for canvas native maxWidth
}

// ── Text Renderer ──────────────────────────────────────────────────

export class TextRenderer {

	/** Measure text width using the given font */
	static measure(ctx: SKRSContext2D, text: string, font: string): { width: number; height: number } {
		ctx.save()
		ctx.font = font
		const metrics = ctx.measureText(text)
		const width = metrics.width
		// Approximate height from font metrics
		const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
		ctx.restore()
		return { width, height }
	}

	/** Draw text at (x, y) with full options: shadow, outline, color */
	static draw(
		ctx: SKRSContext2D,
		x: number,
		y: number,
		text: string,
		opts: DrawTextOptions,
	): void {
		ctx.save()

		ctx.font = opts.font
		ctx.textAlign = opts.align || 'left'
		ctx.textBaseline = opts.baseline || 'top'

		// Shadow (native Skia — true Gaussian, no manual layer needed)
		if (opts.shadow) {
			ctx.shadowColor = opts.shadow.color
			ctx.shadowBlur = opts.shadow.blur
			ctx.shadowOffsetX = opts.shadow.offsetX
			ctx.shadowOffsetY = opts.shadow.offsetY
		}

		// Outline / stroke (true vector path, not the Pillow nested-loop hack)
		if (opts.outline) {
			ctx.lineWidth = opts.outline.width * 2  // strokeText strokes centered on path
			ctx.lineJoin = 'round'
			ctx.strokeStyle = opts.outline.color
			ctx.strokeText(text, x, y, opts.maxWidth)
		}

		// Fill
		ctx.fillStyle = opts.color || '#FFFFFF'
		ctx.fillText(text, x, y, opts.maxWidth)

		ctx.restore()
	}

	/** Draw multiline text (newline-separated) with line spacing */
	static drawMultiline(
		ctx: SKRSContext2D,
		x: number,
		y: number,
		text: string,
		opts: DrawTextOptions & { lineSpacing?: number },
	): number {
		const lines = text.split('\n')
		const spacing = opts.lineSpacing ?? 10
		let currentY = y

		for (const line of lines) {
			TextRenderer.draw(ctx, x, currentY, line, opts)
			const metrics = TextRenderer.measure(ctx, line, opts.font)
			currentY += metrics.height + spacing
		}

		return currentY - y  // total height drawn
	}

	/**
	 * Auto-size font: find the largest size that fits within maxWidth.
	 * Binary search — same logic as Python's fit_font_size().
	 */
	static fitFontSize(
		ctx: SKRSContext2D,
		text: string,
		fontPreset: string,
		maxWidth: number,
		maxSize: number = 200,
		minSize: number = 16,
	): { font: string; size: number } {
		let lo = minSize
		let hi = maxSize
		let bestSize = minSize

		while (lo <= hi) {
			const mid = Math.floor((lo + hi) / 2)
			const font = preset(fontPreset, mid)
			const { width } = TextRenderer.measure(ctx, text, font)
			if (width <= maxWidth) {
				bestSize = mid
				lo = mid + 1
			} else {
				hi = mid - 1
			}
		}

		return { font: preset(fontPreset, bestSize), size: bestSize }
	}

	/** Word wrap: break text into lines that fit within maxWidth */
	static wordWrap(
		ctx: SKRSContext2D,
		text: string,
		font: string,
		maxWidth: number,
	): string {
		const words = text.split(' ')
		const lines: string[] = []
		let current: string[] = []

		ctx.save()
		ctx.font = font

		for (const word of words) {
			const testLine = [...current, word].join(' ')
			const metrics = ctx.measureText(testLine)
			if (metrics.width > maxWidth && current.length > 0) {
				lines.push(current.join(' '))
				current = [word]
			} else {
				current.push(word)
			}
		}

		if (current.length > 0) {
			lines.push(current.join(' '))
		}

		ctx.restore()
		return lines.join('\n')
	}

	/** Measure multiline text total height */
	static measureMultiline(
		ctx: SKRSContext2D,
		text: string,
		font: string,
		lineSpacing: number = 10,
	): { width: number; height: number } {
		const lines = text.split('\n')
		let maxWidth = 0
		let totalHeight = 0

		ctx.save()
		ctx.font = font

		for (let i = 0; i < lines.length; i++) {
			const metrics = ctx.measureText(lines[i])
			const lineHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
			maxWidth = Math.max(maxWidth, metrics.width)
			totalHeight += lineHeight
			if (i < lines.length - 1) totalHeight += lineSpacing
		}

		ctx.restore()
		return { width: maxWidth, height: totalHeight }
	}
}
