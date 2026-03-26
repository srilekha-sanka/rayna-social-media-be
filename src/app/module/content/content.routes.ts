import { Router } from 'express'
import ContentController from './content.controller'

const contentController = new ContentController()
const contentRouter = Router()

contentRouter.post('/generate-carousel', contentController.generateCarousel)
contentRouter.post('/generate-reel', contentController.generateReel)
contentRouter.get('/jobs/:jobId', contentController.getJobStatus)

export { contentRouter }
