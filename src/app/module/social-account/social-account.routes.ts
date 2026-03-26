import { Router } from 'express'
import SocialAccountController from './social-account.controller'

const socialAccountController = new SocialAccountController()
const socialAccountRouter = Router()

socialAccountRouter.post('/auth-url', socialAccountController.getAuthUrl)
socialAccountRouter.post('/callback', socialAccountController.finalizeConnection)
socialAccountRouter.get('/', socialAccountController.findAll)
socialAccountRouter.get('/:id', socialAccountController.findById)
socialAccountRouter.delete('/:id', socialAccountController.disconnect)
socialAccountRouter.post('/:id/refresh', socialAccountController.refreshStatus)

export { socialAccountRouter }
