import { Request, Response, NextFunction } from 'express'
import { mediaAssetService } from './media-asset.service'
import ResponseService from '../../utils/response.service'

class MediaAssetController extends ResponseService {
	constructor() {
		super()
	}

	upload = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const file = req.file as Express.Multer.File
			const { product_id } = req.body
			const { statusCode, payload, message } = await mediaAssetService.upload(file, product_id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	uploadMultiple = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const files = req.files as Express.Multer.File[]
			const { product_id } = req.body
			const { statusCode, payload, message } = await mediaAssetService.uploadMultiple(files, product_id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAll = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const query = {
				page: Math.max(1, parseInt(req.query.page as string, 10) || 1),
				limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20)),
				product_id: req.query.product_id as string | undefined,
				type: req.query.type as string | undefined,
				source: req.query.source as string | undefined,
			}
			const { statusCode, payload, message } = await mediaAssetService.findAll(query)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await mediaAssetService.findById(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	delete = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await mediaAssetService.delete(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default MediaAssetController
