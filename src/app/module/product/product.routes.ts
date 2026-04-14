import { Router } from 'express'
import ProductController from './product.controller'

const productController = new ProductController()
const productRouter = Router()

productRouter.post('/', productController.create)
productRouter.post('/sync', productController.sync)
productRouter.post('/bulk', productController.bulkCreate)
productRouter.get('/', productController.findAll)
productRouter.get('/:id', productController.findById)
productRouter.patch('/:id', productController.update)
productRouter.delete('/:id', productController.delete)

export { productRouter }
