import { WhereOptions } from 'sequelize'
import MediaAsset from './media-asset.model'
import Product from '../product/product.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { getMediaType } from '../../config/upload.config'
import sharp from 'sharp'

class MediaAssetService {
	async upload(
		file: Express.Multer.File,
		productId?: string
	): Promise<IServiceResponse> {
		if (!file) {
			throw new BadRequestError('No file provided')
		}

		let dimensions: { width: number; height: number } | undefined

		if (file.mimetype.startsWith('image/')) {
			const metadata = await sharp(file.path).metadata()
			dimensions = { width: metadata.width || 0, height: metadata.height || 0 }
		}

		const asset = await MediaAsset.create({
			type: getMediaType(file.mimetype),
			source: 'UPLOADED',
			file_path: file.path,
			file_name: file.originalname,
			file_size: file.size,
			mime_type: file.mimetype,
			dimensions,
			product_id: productId,
		})

		return { statusCode: 201, payload: asset, message: 'File uploaded successfully' }
	}

	async uploadMultiple(
		files: Express.Multer.File[],
		productId?: string
	): Promise<IServiceResponse> {
		if (!files || files.length === 0) {
			throw new BadRequestError('No files provided')
		}

		const assets = await Promise.all(
			files.map(async (file) => {
				let dimensions: { width: number; height: number } | undefined

				if (file.mimetype.startsWith('image/')) {
					const metadata = await sharp(file.path).metadata()
					dimensions = { width: metadata.width || 0, height: metadata.height || 0 }
				}

				return MediaAsset.create({
					type: getMediaType(file.mimetype),
					source: 'UPLOADED',
					file_path: file.path,
					file_name: file.originalname,
					file_size: file.size,
					mime_type: file.mimetype,
					dimensions,
					product_id: productId,
				})
			})
		)

		return { statusCode: 201, payload: assets, message: `${assets.length} files uploaded successfully` }
	}

	async findAll(query: {
		page: number
		limit: number
		product_id?: string
		type?: string
		source?: string
	}): Promise<IServiceResponse> {
		const { page, limit, product_id, type, source } = query
		const offset = (page - 1) * limit

		const where: WhereOptions = { is_active: true }

		if (product_id) where.product_id = product_id
		if (type) where.type = type
		if (source) where.source = source

		const { rows: assets, count: total } = await MediaAsset.findAndCountAll({
			where,
			limit,
			offset,
			order: [['createdAt', 'DESC']],
			include: [{ model: Product, attributes: ['id', 'name'] }],
		})

		return {
			statusCode: 200,
			payload: {
				assets,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			},
			message: 'Media assets fetched successfully',
		}
	}

	async findById(id: string): Promise<IServiceResponse> {
		const asset = await MediaAsset.findByPk(id, {
			include: [{ model: Product, attributes: ['id', 'name'] }],
		})

		if (!asset) {
			throw new NotFoundError('Media asset not found')
		}

		return { statusCode: 200, payload: asset, message: 'Media asset fetched successfully' }
	}

	async delete(id: string): Promise<IServiceResponse> {
		const asset = await MediaAsset.findByPk(id)

		if (!asset) {
			throw new NotFoundError('Media asset not found')
		}

		await asset.destroy()

		return { statusCode: 200, payload: null, message: 'Media asset deleted successfully' }
	}
}

export const mediaAssetService = new MediaAssetService()
