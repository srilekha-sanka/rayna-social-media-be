import { Router } from 'express'
import { freepikController } from './freepik.controller'

const freepikRouter = Router()

freepikRouter.get('/search', freepikController.search)
freepikRouter.get('/download/:id', freepikController.download)

export default freepikRouter
