import { Router } from 'express'
import AuthController from './auth.controller'
import { verifyToken } from '../../middlewares/verifyAuth'

const authController = new AuthController()
const authRouter = Router()

authRouter.post('/register', authController.register)
authRouter.post('/login', authController.login)
authRouter.post('/refresh-token', authController.refreshToken)
authRouter.post('/logout', verifyToken, authController.logout)

export { authRouter }
