import { Router } from 'express'
import ImageController from './image.controller'
import { upload } from '../../config/upload.config'

const imageController = new ImageController()
const imageRouter = Router()

imageRouter.post('/overlay', upload.single('file'), imageController.overlay)
imageRouter.post('/price-tag', upload.single('file'), imageController.priceTag)
imageRouter.post('/carousel', upload.array('files', 10), imageController.carousel)

export { imageRouter }
