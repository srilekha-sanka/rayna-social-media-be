import { BadRequestError } from '../../errors/api-errors'

const VALID_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'reddit', 'threads', 'snapchat', 'telegram']
const VALID_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED']

interface CreatePostBody {
	campaign_id?: string
	base_content?: string
	hashtags?: string[]
	cta_text?: string
	platforms?: string[]
	media_urls?: string[]
	scheduled_at?: string
}

interface UpdatePostBody extends Partial<CreatePostBody> {
	status?: string
}

export const validateCreatePost = (body: any): CreatePostBody => {
	if (body.platforms && !Array.isArray(body.platforms)) {
		throw new BadRequestError('platforms must be an array')
	}

	if (body.platforms) {
		const invalid = body.platforms.filter((p: string) => !VALID_PLATFORMS.includes(p.toLowerCase()))
		if (invalid.length > 0) {
			throw new BadRequestError(`Invalid platforms: ${invalid.join(', ')}. Valid: ${VALID_PLATFORMS.join(', ')}`)
		}
	}

	if (body.media_urls && !Array.isArray(body.media_urls)) {
		throw new BadRequestError('media_urls must be an array')
	}

	if (body.hashtags && !Array.isArray(body.hashtags)) {
		throw new BadRequestError('hashtags must be an array')
	}

	return {
		campaign_id: body.campaign_id,
		base_content: body.base_content?.trim(),
		hashtags: body.hashtags || [],
		cta_text: body.cta_text?.trim(),
		platforms: body.platforms?.map((p: string) => p.toLowerCase()) || [],
		media_urls: body.media_urls || [],
		scheduled_at: body.scheduled_at,
	}
}

export const validateUpdatePost = (body: any): UpdatePostBody => {
	if (body.status && !VALID_STATUSES.includes(body.status)) {
		throw new BadRequestError(`status must be one of: ${VALID_STATUSES.join(', ')}`)
	}

	if (body.platforms) {
		const invalid = body.platforms.filter((p: string) => !VALID_PLATFORMS.includes(p.toLowerCase()))
		if (invalid.length > 0) {
			throw new BadRequestError(`Invalid platforms: ${invalid.join(', ')}`)
		}
	}

	const update: UpdatePostBody = {}

	if (body.base_content !== undefined) update.base_content = body.base_content?.trim()
	if (body.hashtags !== undefined) update.hashtags = body.hashtags
	if (body.cta_text !== undefined) update.cta_text = body.cta_text?.trim()
	if (body.platforms !== undefined) update.platforms = body.platforms.map((p: string) => p.toLowerCase())
	if (body.media_urls !== undefined) update.media_urls = body.media_urls
	if (body.status !== undefined) update.status = body.status
	if (body.scheduled_at !== undefined) update.scheduled_at = body.scheduled_at

	return update
}
