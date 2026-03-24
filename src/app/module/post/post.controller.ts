import { Request, Response, NextFunction } from 'express'
import { postService } from './post.service'
import { validateCreatePost, validateUpdatePost } from './post.validator'
import ResponseService from '../../utils/response.service'

class PostController extends ResponseService {
	constructor() {
		super()
	}

	create = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateCreatePost(req.body)
			const authorId = req.user.userId
			const { statusCode, payload, message } = await postService.create(validated, authorId)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findAll = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const query = {
				page: Math.max(1, parseInt(req.query.page as string, 10) || 1),
				limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20)),
				campaign_id: req.query.campaign_id as string | undefined,
				status: req.query.status as string | undefined,
				platform: req.query.platform as string | undefined,
			}
			const { statusCode, payload, message } = await postService.findAll(query)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	findById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await postService.findById(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	update = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validated = validateUpdatePost(req.body)
			const { statusCode, payload, message } = await postService.update(req.params.id, validated as any)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	delete = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await postService.delete(req.params.id)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default PostController
