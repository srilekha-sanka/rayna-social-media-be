import { Router } from 'express'
import BrandController from './brand.controller'

const brandController = new BrandController()
const brandRouter = Router()

brandRouter.post('/', brandController.create)
brandRouter.get('/', brandController.findAll)
brandRouter.get('/:id', brandController.findById)
brandRouter.patch('/:id', brandController.update)
brandRouter.delete('/:id', brandController.delete)

export { brandRouter }
