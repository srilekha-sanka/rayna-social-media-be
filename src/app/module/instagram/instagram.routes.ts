import { Router } from 'express'
import InstagramController from './instagram.controller'

const instagramController = new InstagramController()
const instagramRouter = Router()

// Credentials management
instagramRouter.get('/credentials', instagramController.getCredentials)
instagramRouter.post('/credentials', instagramController.saveCredentials)
instagramRouter.delete('/credentials', instagramController.deleteCredentials)

// Publish directly (with image_url/video_url + caption)
instagramRouter.post('/publish', instagramController.publish)

// Publish an existing post from our DB to Instagram
instagramRouter.post('/publish/:postId', instagramController.publishPost)

// Fetch recent media from Instagram account
instagramRouter.get('/media', instagramController.getMedia)

export { instagramRouter }
