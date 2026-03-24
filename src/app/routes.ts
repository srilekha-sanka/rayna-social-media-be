import express from 'express'
import { authRouter } from './module/auth/auth.routes'
import { roleRouter } from './module/role/role.routes'
import { verifyToken } from './middlewares/verifyAuth'

const routes = express.Router()


routes.use('/auth', authRouter)
routes.use('/role', verifyToken, roleRouter)

export default routes
