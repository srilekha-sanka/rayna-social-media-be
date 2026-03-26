import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { BadRequestError } from '../errors/api-errors'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

// Ensure upload directories exist
const ensureDir = (dir: string) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}
}

ensureDir(path.join(UPLOAD_DIR, 'originals'))
ensureDir(path.join(UPLOAD_DIR, 'processed'))

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		const dir = path.join(UPLOAD_DIR, 'originals')
		cb(null, dir)
	},
	filename: (_req, file, cb) => {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
		const ext = path.extname(file.originalname)
		cb(null, `${uniqueSuffix}${ext}`)
	},
})

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (ALLOWED_TYPES.includes(file.mimetype)) {
		cb(null, true)
	} else {
		cb(new BadRequestError(`File type '${file.mimetype}' is not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`))
	}
}

export const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_FILE_SIZE },
})

export const getMediaType = (mimetype: string): 'IMAGE' | 'VIDEO' | 'AUDIO' => {
	if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'IMAGE'
	if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'VIDEO'
	return 'IMAGE'
}

export { UPLOAD_DIR }
