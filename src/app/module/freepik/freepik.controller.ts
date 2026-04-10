import { Request, Response, NextFunction } from 'express'
import { freepikService } from './freepik.service'
import Joi from 'joi'

const searchSchema = Joi.object({
	term: Joi.string().required().trim(),
	page: Joi.number().integer().min(1).default(1),
	limit: Joi.number().integer().min(1).max(50).default(20),
	orientation: Joi.string().valid('landscape', 'portrait', 'square').optional(),
	content_type: Joi.string().valid('photo', 'vector', 'psd').optional(),
})

class FreepikController {
	search = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = searchSchema.validate(req.query, { abortEarly: false, stripUnknown: true })
			if (error) return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') })

			const result = await freepikService.searchStock(value)
			res.json({ success: true, payload: result, message: 'Stock images fetched' })
		} catch (err) {
			next(err)
		}
	}

	download = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const resourceId = parseInt(req.params.id, 10)
			if (isNaN(resourceId)) return res.status(400).json({ success: false, message: 'Invalid resource ID' })

			const downloadUrl = await freepikService.downloadResource(resourceId)
			res.json({ success: true, payload: { download_url: downloadUrl }, message: 'Download URL fetched' })
		} catch (err) {
			next(err)
		}
	}
}

export const freepikController = new FreepikController()
