import { Router } from 'express'
import MediaAssetController from './media-asset.controller'
import { upload } from '../../config/upload.config'

const mediaAssetController = new MediaAssetController()
const mediaAssetRouter = Router()

mediaAssetRouter.post('/upload', upload.single('file'), mediaAssetController.upload)
mediaAssetRouter.post('/upload-multiple', upload.array('files', 10), mediaAssetController.uploadMultiple)
mediaAssetRouter.get('/', mediaAssetController.findAll)
mediaAssetRouter.get('/:id', mediaAssetController.findById)
mediaAssetRouter.delete('/:id', mediaAssetController.delete)

export { mediaAssetRouter }
