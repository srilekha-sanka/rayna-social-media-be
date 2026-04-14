import { Request, Response, NextFunction } from 'express'
import { productService } from './product.service'
import { syncProductsFromFeed } from './product-sync.service'
import { createProductSchema, updateProductSchema, productListQuerySchema } from './product.validator'
import ResponseService from '../../utils/response.service'
import { BadRequestError } from '../../errors/api-errors'

class ProductController extends ResponseService {
	constructor() {
		super()
	}

	create = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = createProductSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await productService.create(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getProductTypes = async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await productService.getDistinctProductTypes()
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAll = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = productListQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await productService.findAll(value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await productService.findById(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	update = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { error, value } = updateProductSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
			if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))

			const { statusCode, payload, message } = await productService.update(req.params.id, value)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	delete = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await productService.delete(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	sync = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await syncProductsFromFeed()
			return this.sendResponse(res, 200, result, `Sync complete — ${result.created} created, ${result.updated} updated`)
		} catch (err) {
			next(err)
		}
	}

	bulkCreate = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { products } = req.body

			if (!Array.isArray(products) || products.length === 0) {
				throw new BadRequestError('products array is required')
			}

			const validated: any[] = []
			for (const product of products) {
				const { error, value } = createProductSchema.validate(product, { abortEarly: false, stripUnknown: true })
				if (error) throw new BadRequestError(error.details.map((d) => d.message).join(', '))
				validated.push(value)
			}

			const { statusCode, payload, message } = await productService.bulkCreate(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default ProductController
