/**
 * Canvas Components
 * =================
 * Reusable UI components: boarding pass, feature icons bar,
 * contact bar, EMI badge, CTA button, coupon badge, logo placement.
 *
 * Based on the Thailand travel poster reference design.
 */
import { createCanvas, loadImage, type SKRSContext2D, type Canvas } from '@napi-rs/canvas'
import { preset, px } from './core'
import { TextRenderer } from './text'
import { Effects } from './effects'

// ── Boarding Pass Component ────────────────────────────────────────

export interface BoardingPassConfig {
	destination: string       // "THAILAND"
	date: string              // "MAR 25"
	flightCode: string        // "ASCOTT0235"
	rotation?: number         // degrees (default: 12)
}

export class Components {

	/**
	 * Draw a boarding pass ticket — tilted, with notched edges, destination,
	 * date, flight code, and barcode. Matches the Thailand poster reference.
	 */
	static drawBoardingPass(
		ctx: SKRSContext2D,
		x: number, y: number,
		w: number, h: number,
		config: BoardingPassConfig,
	): void {
		const rotation = (config.rotation ?? 12) * Math.PI / 180

		ctx.save()

		// Translate to center of ticket, rotate, translate back
		const cx = x + w / 2
		const cy = y + h / 2
		ctx.translate(cx, cy)
		ctx.rotate(rotation)
		ctx.translate(-w / 2, -h / 2)

		// Ticket body with notches
		Effects.ticketShape(ctx, 0, 0, w, h, {
			fill: '#FFFFF5',
			cornerRadius: 10,
			notchRadius: 12,
			notchY: 0.25,
			shadow: { color: 'rgba(0,0,0,0.35)', blur: 18, offsetX: 4, offsetY: 8 },
		})

		// ── Header: "Boarding Pass" ────────────────────────────
		const headerH = h * 0.22
		Effects.roundedRectPath(ctx, 0, 0, w, headerH, 10)
		// Clip only top corners
		ctx.save()
		ctx.clip()
		ctx.fillStyle = '#1B3A6B'
		ctx.fillRect(0, 0, w, headerH)
		ctx.restore()

		ctx.font = preset('montserrat-bold', Math.round(w * 0.065))
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = '#FFFFFF'
		ctx.fillText('Boarding Pass', w / 2, headerH / 2)

		// ── Dashed tear line ──────────────────────────────────
		const tearY = h * 0.25
		Effects.dashedLine(ctx, 16, tearY, w - 16, tearY, 'rgba(180,180,180,0.6)', [5, 4])

		// ── Destination ───────────────────────────────────────
		const contentStartY = tearY + 16

		ctx.font = preset('montserrat', Math.round(w * 0.048))
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		ctx.fillStyle = '#C0392B'
		ctx.fillText('Destination', 20, contentStartY)

		ctx.font = preset('montserrat-bold', Math.round(w * 0.072))
		ctx.fillStyle = '#1B3A6B'
		ctx.fillText(config.destination, 20, contentStartY + w * 0.06)

		// ── Date & Flight ─────────────────────────────────────
		const infoY = contentStartY + w * 0.17

		// Date
		ctx.font = preset('montserrat', Math.round(w * 0.042))
		ctx.fillStyle = '#888888'
		ctx.fillText('Date', 20, infoY)

		ctx.font = preset('montserrat-bold', Math.round(w * 0.058))
		ctx.fillStyle = '#222222'
		ctx.fillText(config.date, 20, infoY + w * 0.055)

		// Flight
		const midX = w * 0.48
		ctx.font = preset('montserrat', Math.round(w * 0.042))
		ctx.fillStyle = '#888888'
		ctx.fillText('Flight', midX, infoY)

		ctx.font = preset('montserrat-bold', Math.round(w * 0.052))
		ctx.fillStyle = '#222222'
		ctx.fillText(config.flightCode, midX, infoY + w * 0.055)

		// ── Barcode ───────────────────────────────────────────
		const barcodeY = h - h * 0.18
		const barcodeW = w * 0.7
		const barcodeH = h * 0.1
		const barcodeX = (w - barcodeW) / 2
		Effects.barcode(ctx, barcodeX, barcodeY, barcodeW, barcodeH, '#333333')

		ctx.restore()
	}

	// ── EMI Badge ──────────────────────────────────────────────────

	static drawEmiBadge(
		ctx: SKRSContext2D,
		x: number, y: number,
		w: number, h: number,
	): void {
		ctx.save()

		// Background
		Effects.roundedRect(ctx, x, y, w, h, 8, '#FFFFFF', {
			color: 'rgba(0,0,0,0.2)', blur: 8, offsetX: 2, offsetY: 3,
		})

		// "EMI" text (bold, red/orange)
		const emiSize = Math.round(h * 0.42)
		ctx.font = preset('montserrat-black', emiSize)
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = '#D32F2F'
		ctx.fillText('EMI', x + w / 2, y + h * 0.38)

		// "Available" text
		const availSize = Math.round(h * 0.25)
		ctx.font = preset('montserrat-semibold', availSize)
		ctx.fillStyle = '#333333'
		ctx.fillText('Available', x + w / 2, y + h * 0.72)

		ctx.restore()
	}

	// ── Trip Duration Badge (5N|4D) ────────────────────────────────

	static drawTripDuration(
		ctx: SKRSContext2D,
		x: number, y: number,
		nights: number,
		days: number,
		fontSize: number = 38,
	): void {
		ctx.save()

		const font = preset('montserrat-bold', fontSize)
		ctx.font = font
		ctx.textBaseline = 'middle'
		ctx.textAlign = 'left'

		// "5" in white bold
		ctx.fillStyle = '#FFFFFF'
		const nText = `${nights}`
		ctx.fillText(nText, x, y)
		let cx = x + ctx.measureText(nText).width

		// "N" slightly smaller
		ctx.font = preset('montserrat-semibold', Math.round(fontSize * 0.65))
		ctx.fillStyle = 'rgba(255,255,255,0.8)'
		ctx.fillText('N', cx + 2, y)
		cx += ctx.measureText('N').width + 6

		// Divider "|"
		ctx.fillStyle = 'rgba(255,255,255,0.5)'
		ctx.fillText('|', cx, y)
		cx += ctx.measureText('|').width + 6

		// "4" in white bold
		ctx.font = preset('montserrat-bold', fontSize)
		ctx.fillStyle = '#FFFFFF'
		const dText = `${days}`
		ctx.fillText(dText, cx, y)
		cx += ctx.measureText(dText).width

		// "D" slightly smaller
		ctx.font = preset('montserrat-semibold', Math.round(fontSize * 0.65))
		ctx.fillStyle = 'rgba(255,255,255,0.8)'
		ctx.fillText('D', cx + 2, y)

		ctx.restore()
	}

	// ── Feature Icons Row ──────────────────────────────────────────

	static drawFeatureRow(
		ctx: SKRSContext2D,
		x: number, y: number,
		width: number,
		features: Array<{ icon: string; label: string }>,
		options: {
			iconSize?: number
			labelSize?: number
			iconColor?: string
			labelColor?: string
			circleRadius?: number
			circleStroke?: string
			circleFill?: string
		} = {},
	): void {
		const n = features.length
		if (n === 0) return

		const colW = width / n
		const iconSize = options.iconSize || 28
		const labelSize = options.labelSize || 13
		const circleR = options.circleRadius || 22

		ctx.save()

		for (let i = 0; i < n; i++) {
			const feat = features[i]
			const cx = x + i * colW + colW / 2

			// Circle background
			Effects.circle(
				ctx, cx, y, circleR,
				options.circleFill || 'rgba(255,255,255,0.08)',
				{ color: options.circleStroke || 'rgba(255,255,255,0.5)', width: 1.5 },
			)

			// Icon character (centered in circle)
			ctx.font = preset('montserrat-bold', iconSize)
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillStyle = options.iconColor || '#FFFFFF'
			ctx.fillText(feat.icon, cx, y)

			// Label below circle
			ctx.font = preset('montserrat', labelSize)
			ctx.fillStyle = options.labelColor || 'rgba(255,255,255,0.9)'
			ctx.textBaseline = 'top'

			// Handle multiline labels
			const lines = feat.label.split('\n')
			let labelY = y + circleR + 10
			for (const line of lines) {
				ctx.fillText(line, cx, labelY)
				labelY += labelSize + 3
			}
		}

		ctx.restore()
	}

	// ── Contact Bar ────────────────────────────────────────────────

	static drawContactBar(
		ctx: SKRSContext2D,
		x: number, y: number,
		width: number,
		contacts: Array<{ city: string; phone: string }>,
		fontSize: number = 16,
	): void {
		const n = contacts.length
		if (n === 0) return

		const colW = width / n

		ctx.save()
		ctx.textAlign = 'center'

		for (let i = 0; i < n; i++) {
			const contact = contacts[i]
			const cx = x + i * colW + colW / 2

			// City name
			ctx.font = preset('montserrat-semibold', fontSize)
			ctx.textBaseline = 'top'
			ctx.fillStyle = '#FFFFFF'
			ctx.fillText(contact.city, cx, y)

			// Phone number
			ctx.font = preset('montserrat-bold', Math.round(fontSize * 1.1))
			ctx.fillStyle = '#FFFFFF'
			ctx.fillText(contact.phone, cx, y + fontSize + 4)
		}

		ctx.restore()
	}

	// ── Top Info Bar (website + email) ─────────────────────────────

	static drawTopBar(
		ctx: SKRSContext2D,
		x: number, y: number,
		width: number,
		website: string,
		email: string,
		fontSize: number = 15,
	): void {
		ctx.save()

		const font = preset('montserrat-semibold', fontSize)
		ctx.font = font
		ctx.textBaseline = 'middle'

		// Website (left side) with globe icon
		ctx.textAlign = 'left'
		ctx.fillStyle = '#FFFFFF'
		ctx.shadowColor = 'rgba(0,0,0,0.5)'
		ctx.shadowBlur = 4
		ctx.shadowOffsetX = 1
		ctx.shadowOffsetY = 1
		ctx.fillText(`@  ${website}`, x, y)

		// Email (right side) with mail icon
		ctx.textAlign = 'right'
		ctx.fillText(`\u2709  ${email}`, x + width, y)

		ctx.restore()
	}

	// ── Logo Placement ─────────────────────────────────────────────

	static async placeLogo(
		ctx: SKRSContext2D,
		logoPath: string,
		x: number, y: number,
		maxWidth: number,
		maxHeight: number,
	): Promise<void> {
		try {
			const logo = await loadImage(logoPath)
			const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height)
			const w = Math.round(logo.width * ratio)
			const h = Math.round(logo.height * ratio)
			ctx.drawImage(logo, x, y, w, h)
		} catch {
			// Skip if logo not found
		}
	}

	// ── CTA Button ─────────────────────────────────────────────────

	static drawCTAButton(
		ctx: SKRSContext2D,
		cx: number, cy: number,
		text: string,
		options: {
			bgColor?: string
			textColor?: string
			fontSize?: number
			paddingX?: number
			height?: number
			radius?: number
		} = {},
	): void {
		const fontSize = options.fontSize || 26
		const padX = options.paddingX || 52
		const btnH = options.height || 56
		const radius = options.radius || btnH / 2

		ctx.save()

		// Measure text
		const font = preset('montserrat-bold', fontSize)
		const { width: tw } = TextRenderer.measure(ctx, text, font)
		const btnW = tw + padX * 2
		const bx = cx - btnW / 2
		const by = cy

		// Button shadow
		Effects.roundedRect(ctx, bx, by, btnW, btnH, radius, options.bgColor || '#EA580C', {
			color: 'rgba(0,0,0,0.25)', blur: 10, offsetX: 0, offsetY: 4,
		})

		// Button text
		ctx.font = font
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = options.textColor || '#FFFFFF'
		ctx.fillText(text, cx, by + btnH / 2)

		ctx.restore()
	}

	// ── Coupon Badge ───────────────────────────────────────────────

	static drawCouponBadge(
		ctx: SKRSContext2D,
		x: number, y: number,
		label: string,
		code: string,
		options: {
			labelBg?: string
			codeBg?: string
			labelColor?: string
			codeColor?: string
			fontSize?: number
			height?: number
			radius?: number
		} = {},
	): { width: number; height: number } {
		const fontSize = options.fontSize || 26
		const h = options.height || 52
		const r = options.radius || 6

		ctx.save()

		const labelFont = preset('montserrat-bold', fontSize)
		const codeFont = preset('montserrat-extrabold', Math.round(fontSize * 1.1))

		const padX = Math.round(h * 0.45)
		const lw = TextRenderer.measure(ctx, label, labelFont).width
		const cw = TextRenderer.measure(ctx, code, codeFont).width

		const labelBoxW = lw + padX * 2
		const codeBoxW = cw + padX * 2

		// Label pill (left)
		Effects.roundedRect(ctx, x, y, labelBoxW, h, r, options.labelBg || '#EA580C')
		ctx.font = labelFont
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = options.labelColor || '#FFFFFF'
		ctx.fillText(label, x + padX, y + h / 2)

		// Code pill (right)
		Effects.roundedRect(ctx, x + labelBoxW, y, codeBoxW, h, r, options.codeBg || '#0F1E3C')
		ctx.font = codeFont
		ctx.fillStyle = options.codeColor || '#FFFFFF'
		ctx.fillText(code, x + labelBoxW + padX, y + h / 2)

		ctx.restore()

		return { width: labelBoxW + codeBoxW, height: h }
	}
}
