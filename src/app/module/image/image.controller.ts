import { Request, Response, NextFunction } from 'express'
import { imageOverlayService } from './image-overlay.service'
import { BadRequestError } from '../../errors/api-errors'
import ResponseService from '../../utils/response.service'

class ImageController extends ResponseService {
	constructor() {
		super()
	}

	/**
	 * POST /image/overlay
	 * Apply text overlays on an uploaded image.
	 * Body: { overlays: TextOverlay[], outputFormat?, quality? }
	 * File: single image via multer
	 */
	overlay = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const file = req.file as Express.Multer.File
			if (!file) throw new BadRequestError('Image file is required')

			const { overlays, outputFormat, quality } = req.body

			const parsedOverlays = typeof overlays === 'string' ? JSON.parse(overlays) : overlays

			if (!Array.isArray(parsedOverlays) || parsedOverlays.length === 0) {
				throw new BadRequestError('overlays array is required')
			}

			const outputPath = await imageOverlayService.applyOverlay({
				imagePath: file.path,
				overlays: parsedOverlays,
				outputFormat: outputFormat || 'jpeg',
				quality: quality ? Number(quality) : 85,
			})

			return this.sendResponse(res, 200, {
				original: file.path,
				processed: outputPath,
				url: `/uploads/processed/${outputPath.split('/').pop()}`,
			}, 'Overlay applied successfully')
		} catch (err) {
			next(err)
		}
	}

	/**
	 * POST /image/price-tag
	 * Apply price tag + CTA on an uploaded image.
	 * Body: { price, offer_label?, cta_text? }
	 * File: single image via multer
	 */
	priceTag = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const file = req.file as Express.Multer.File
			if (!file) throw new BadRequestError('Image file is required')

			const { price, offer_label, cta_text } = req.body

			if (!price) throw new BadRequestError('price is required')

			const outputPath = await imageOverlayService.applyPriceTag({
				imagePath: file.path,
				price: String(price),
				offerLabel: offer_label,
				ctaText: cta_text,
			})

			return this.sendResponse(res, 200, {
				original: file.path,
				processed: outputPath,
				url: `/uploads/processed/${outputPath.split('/').pop()}`,
			}, 'Price tag applied successfully')
		} catch (err) {
			next(err)
		}
	}

	/**
	 * POST /image/carousel
	 * Process multiple images with price tags for carousel.
	 * Files: multiple images via multer
	 * Body: { price_text?, cta_text? }
	 */
	carousel = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const files = req.files as Express.Multer.File[]
			if (!files || files.length === 0) throw new BadRequestError('At least one image is required')

			const { price_text, cta_text } = req.body

			const slides = files.map((file) => ({
				imagePath: file.path,
				overlayText: '',
				priceText: price_text,
				ctaText: cta_text,
			}))

			const processedPaths = await imageOverlayService.processCarousel(slides)

			const results = processedPaths.map((p) => ({
				processed: p,
				url: `/uploads/processed/${p.split('/').pop()}`,
			}))

			return this.sendResponse(res, 200, { slides: results }, `${results.length} carousel images processed`)
		} catch (err) {
			next(err)
		}
	}
}

export default ImageController
