import { Router } from 'express'
import PostController from './post.controller'

const postController = new PostController()
const postRouter = Router()

postRouter.post('/', postController.create)
postRouter.get('/', postController.findAll)
postRouter.get('/:id', postController.findById)
postRouter.patch('/:id', postController.update)
postRouter.delete('/:id', postController.delete)

export { postRouter }
