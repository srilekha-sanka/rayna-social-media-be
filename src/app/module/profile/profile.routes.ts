import { Router } from 'express'
import ProfileController from './profile.controller'
import { upload } from '../../config/upload.config'

const profileController = new ProfileController()
const profileRouter = Router()

profileRouter.get('/', profileController.getProfile)
profileRouter.patch('/', profileController.updateProfile)
profileRouter.patch('/photo', upload.single('photo'), profileController.updatePhoto)
profileRouter.delete('/photo', profileController.removePhoto)

export { profileRouter }
