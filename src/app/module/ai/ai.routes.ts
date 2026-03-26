import { Router } from 'express'
import AiController from './ai.controller'

const aiController = new AiController()
const aiRouter = Router()

aiRouter.post('/caption', aiController.generateCaption)
aiRouter.post('/hashtags', aiController.generateHashtags)
aiRouter.post('/carousel-content', aiController.generateCarouselContent)

export { aiRouter }
