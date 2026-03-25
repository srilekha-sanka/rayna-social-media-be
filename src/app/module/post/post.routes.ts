import { Router } from 'express'
import PostController from './post.controller'

const postController = new PostController()
const postRouter = Router()

postRouter.post('/', postController.create)
postRouter.get('/', postController.findAll)
postRouter.get('/:id', postController.findById)
postRouter.patch('/:id', postController.update)
postRouter.delete('/:id', postController.delete)

// Approval workflow
postRouter.post('/:id/submit', postController.submitForReview)
postRouter.post('/:id/approve', postController.approve)
postRouter.post('/:id/reject', postController.reject)
postRouter.post('/:id/publish', postController.publish)
postRouter.post('/:id/schedule', postController.schedule)

export { postRouter }
