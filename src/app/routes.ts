import express from 'express'
import { authRouter } from './module/auth/auth.routes'
import { roleRouter } from './module/role/role.routes'
import { productRouter } from './module/product/product.routes'
import { mediaAssetRouter } from './module/media-asset/media-asset.routes'
import { campaignRouter } from './module/campaign/campaign.routes'
import { postRouter } from './module/post/post.routes'
import { imageRouter } from './module/image/image.routes'
import { aiRouter } from './module/ai/ai.routes'
import { contentRouter } from './module/content/content.routes'
import { socialAccountRouter, socialAccountPublicRouter } from './module/social-account/social-account.routes'
import { contentStudioRouter } from './module/content-studio/content-studio.routes'
import freepikRouter from './module/freepik/freepik.routes'
import { verifyToken } from './middlewares/verifyAuth'

const routes = express.Router()

routes.use('/auth', authRouter)
routes.use('/role', verifyToken, roleRouter)
routes.use('/products', verifyToken, productRouter)
routes.use('/media', verifyToken, mediaAssetRouter)
routes.use('/campaigns', verifyToken, campaignRouter)
routes.use('/posts', verifyToken, postRouter)
routes.use('/image', verifyToken, imageRouter)
routes.use('/ai', verifyToken, aiRouter)
routes.use('/content', verifyToken, contentRouter)
routes.use('/social-accounts', socialAccountPublicRouter)
routes.use('/social-accounts', verifyToken, socialAccountRouter)
routes.use('/content-studio', verifyToken, contentStudioRouter)
routes.use('/stock-media', verifyToken, freepikRouter)

export default routes
