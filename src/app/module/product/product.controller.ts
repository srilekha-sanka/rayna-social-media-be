import { Request, Response, NextFunction } from 'express'
import { productService } from './product.service'
import { validateCreateProduct, validateUpdateProduct, validateProductListQuery } from './product.validator'
import ResponseService from '../../utils/response.service'

class ProductController extends ResponseService {
	constructor() {
		super()
	}

	create = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateCreateProduct(req.body)
			const { statusCode, payload, message } = await productService.create(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAll = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const query = validateProductListQuery(req.query)
			const { statusCode, payload, message } = await productService.findAll(query)
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
			const validated = validateUpdateProduct(req.body)
			const { statusCode, payload, message } = await productService.update(req.params.id, validated)
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

	bulkCreate = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { products } = req.body

			if (!Array.isArray(products) || products.length === 0) {
				return this.sendResponse(res, 400, null, 'products array is required')
			}

			const validated = products.map(validateCreateProduct)
			const { statusCode, payload, message } = await productService.bulkCreate(validated)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default ProductController
