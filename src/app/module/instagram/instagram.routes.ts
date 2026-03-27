import { Router } from 'express'
import InstagramController from './instagram.controller'

const instagramController = new InstagramController()
const instagramRouter = Router()

instagramRouter.post('/publish', instagramController.publish)
instagramRouter.post('/publish/:postId', instagramController.publishPost)
instagramRouter.get('/media', instagramController.getMedia)

export { instagramRouter }
