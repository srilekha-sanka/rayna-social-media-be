import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOAD_DIR } from '../../config/upload.config'

interface TextOverlay {
	text: string
	position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center'
	fontSize?: number
	fontColor?: string
	backgroundColor?: string
	padding?: number
}

interface OverlayOptions {
	imagePath: string
	overlays: TextOverlay[]
	outputFormat?: 'jpeg' | 'png' | 'webp'
	quality?: number
}

interface PriceTagOptions {
	imagePath: string
	price: string
	offerLabel?: string
	ctaText?: string
	outputFormat?: 'jpeg' | 'png' | 'webp'
}

interface CarouselSlide {
	imagePath: string
	overlayText: string
	priceText?: string
	ctaText?: string
}

const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed')

const ensureDir = (dir: string) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}
}

ensureDir(PROCESSED_DIR)

class ImageOverlayService {
	/**
	 * Apply text overlays on an image using Sharp's SVG composite.
	 * This avoids the native canvas dependency — pure Sharp solution.
	 */
	async applyOverlay(options: OverlayOptions): Promise<string> {
		const { imagePath, overlays, outputFormat = 'jpeg', quality = 85 } = options

		const image = sharp(imagePath)
		const metadata = await image.metadata()
		const width = metadata.width || 1200
		const height = metadata.height || 800

		const svgParts = overlays.map((overlay) => {
			const fontSize = overlay.fontSize || 32
			const fontColor = overlay.fontColor || '#FFFFFF'
			const bgColor = overlay.backgroundColor || 'rgba(0,0,0,0.6)'
			const padding = overlay.padding || 16

			const { x, y, anchor } = this.calculatePosition(overlay.position, width, height, padding)

			const escapedText = this.escapeXml(overlay.text)

			return `
				<rect x="${x - padding}" y="${y - fontSize - padding}" width="${this.estimateTextWidth(overlay.text, fontSize) + padding * 2}" height="${fontSize + padding * 2}" rx="8" ry="8" fill="${bgColor}" />
				<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fontColor}" text-anchor="${anchor}">${escapedText}</text>
			`
		})

		const svgOverlay = `
			<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
				${svgParts.join('\n')}
			</svg>
		`

		const outputFileName = `overlay-${Date.now()}-${Math.round(Math.random() * 1e6)}.${outputFormat}`
		const outputPath = path.join(PROCESSED_DIR, outputFileName)

		let pipeline = image.composite([
			{ input: Buffer.from(svgOverlay), top: 0, left: 0 },
		])

		if (outputFormat === 'jpeg') {
			pipeline = pipeline.jpeg({ quality })
		} else if (outputFormat === 'png') {
			pipeline = pipeline.png()
		} else if (outputFormat === 'webp') {
			pipeline = pipeline.webp({ quality })
		}

		await pipeline.toFile(outputPath)

		return outputPath
	}

	/**
	 * Apply a product price tag + CTA banner on an image.
	 * Standard layout: price tag top-right, CTA banner bottom.
	 */
	async applyPriceTag(options: PriceTagOptions): Promise<string> {
		const { imagePath, price, offerLabel, ctaText, outputFormat = 'jpeg' } = options

		const image = sharp(imagePath)
		const metadata = await image.metadata()
		const width = metadata.width || 1200
		const height = metadata.height || 800

		const svgParts: string[] = []

		// Price tag — top right
		const priceText = this.escapeXml(price)
		const priceWidth = this.estimateTextWidth(price, 36) + 40
		const priceX = width - priceWidth - 20
		svgParts.push(`
			<rect x="${priceX}" y="20" width="${priceWidth}" height="56" rx="12" ry="12" fill="#E53E3E" />
			<text x="${priceX + 20}" y="58" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF">${priceText}</text>
		`)

		// Offer label — below price tag
		if (offerLabel) {
			const labelText = this.escapeXml(offerLabel)
			const labelWidth = this.estimateTextWidth(offerLabel, 20) + 24
			svgParts.push(`
				<rect x="${priceX}" y="84" width="${labelWidth}" height="32" rx="6" ry="6" fill="#38A169" />
				<text x="${priceX + 12}" y="106" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">${labelText}</text>
			`)
		}

		// CTA banner — bottom
		if (ctaText) {
			const ctaEscaped = this.escapeXml(ctaText)
			svgParts.push(`
				<rect x="0" y="${height - 70}" width="${width}" height="70" fill="rgba(0,0,0,0.75)" />
				<text x="${width / 2}" y="${height - 28}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${ctaEscaped}</text>
			`)
		}

		const svgOverlay = `
			<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
				${svgParts.join('\n')}
			</svg>
		`

		const outputFileName = `priced-${Date.now()}-${Math.round(Math.random() * 1e6)}.${outputFormat}`
		const outputPath = path.join(PROCESSED_DIR, outputFileName)

		await image
			.composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
			.jpeg({ quality: 90 })
			.toFile(outputPath)

		return outputPath
	}

	/**
	 * Process multiple carousel slides with consistent styling.
	 */
	async processCarousel(slides: CarouselSlide[]): Promise<string[]> {
		const results = await Promise.all(
			slides.map((slide) =>
				this.applyPriceTag({
					imagePath: slide.imagePath,
					price: slide.priceText || '',
					ctaText: slide.ctaText,
				})
			)
		)

		return results
	}

	private calculatePosition(
		position: TextOverlay['position'],
		width: number,
		height: number,
		padding: number
	): { x: number; y: number; anchor: string } {
		switch (position) {
			case 'top-left':
				return { x: padding + 20, y: padding + 40, anchor: 'start' }
			case 'top-right':
				return { x: width - padding - 20, y: padding + 40, anchor: 'end' }
			case 'bottom-left':
				return { x: padding + 20, y: height - padding - 20, anchor: 'start' }
			case 'bottom-right':
				return { x: width - padding - 20, y: height - padding - 20, anchor: 'end' }
			case 'bottom-center':
				return { x: width / 2, y: height - padding - 20, anchor: 'middle' }
			case 'center':
			default:
				return { x: width / 2, y: height / 2, anchor: 'middle' }
		}
	}

	private estimateTextWidth(text: string, fontSize: number): number {
		return text.length * fontSize * 0.6
	}

	private escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;')
	}
}

export const imageOverlayService = new ImageOverlayService()
