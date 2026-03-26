import { WhereOptions } from 'sequelize'
import MediaAsset from './media-asset.model'
import Product from '../product/product.model'
import { cloudinaryService } from '../cloudinary/cloudinary.service'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError, BadRequestError } from '../../errors/api-errors'
import { getMediaType } from '../../config/upload.config'

class MediaAssetService {
	async upload(file: Express.Multer.File, productId?: string): Promise<IServiceResponse> {
		if (!file) throw new BadRequestError('No file provided')

		const result = await cloudinaryService.upload(file.path, {
			folder: productId ? `rayna/products/${productId}` : 'rayna/uploads',
			resourceType: file.mimetype.startsWith('video/') ? 'video' : 'image',
		})

		const asset = await MediaAsset.create({
			type: getMediaType(file.mimetype),
			source: 'CLOUDINARY',
			file_path: result.secure_url,
			file_name: file.originalname,
			file_size: result.bytes,
			mime_type: file.mimetype,
			dimensions: result.width && result.height ? { width: result.width, height: result.height } : undefined,
			product_id: productId,
			public_id: result.public_id,
			secure_url: result.secure_url,
		})

		return { statusCode: 201, payload: asset, message: 'File uploaded successfully' }
	}

	async uploadMultiple(files: Express.Multer.File[], productId?: string): Promise<IServiceResponse> {
		if (!files || files.length === 0) throw new BadRequestError('No files provided')

		const assets = await Promise.all(
			files.map(async (file) => {
				const result = await cloudinaryService.upload(file.path, {
					folder: productId ? `rayna/products/${productId}` : 'rayna/uploads',
					resourceType: file.mimetype.startsWith('video/') ? 'video' : 'image',
				})

				return MediaAsset.create({
					type: getMediaType(file.mimetype),
					source: 'CLOUDINARY',
					file_path: result.secure_url,
					file_name: file.originalname,
					file_size: result.bytes,
					mime_type: file.mimetype,
					dimensions: result.width && result.height ? { width: result.width, height: result.height } : undefined,
					product_id: productId,
					public_id: result.public_id,
					secure_url: result.secure_url,
				})
			})
		)

		return { statusCode: 201, payload: assets, message: `${assets.length} files uploaded successfully` }
	}

	async findAll(query: { page: number; limit: number; product_id?: string; type?: string; source?: string }): Promise<IServiceResponse> {
		const { page, limit, product_id, type, source } = query
		const offset = (page - 1) * limit
		const where: WhereOptions = { is_active: true }

		if (product_id) where.product_id = product_id
		if (type) where.type = type
		if (source) where.source = source

		const { rows: assets, count: total } = await MediaAsset.findAndCountAll({
			where, limit, offset,
			order: [['createdAt', 'DESC']],
			include: [{ model: Product, attributes: ['id', 'name'] }],
		})

		return {
			statusCode: 200,
			payload: { assets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
			message: 'Media assets fetched successfully',
		}
	}

	async findById(id: string): Promise<IServiceResponse> {
		const asset = await MediaAsset.findByPk(id, { include: [{ model: Product, attributes: ['id', 'name'] }] })
		if (!asset) throw new NotFoundError('Media asset not found')
		return { statusCode: 200, payload: asset, message: 'Media asset fetched successfully' }
	}

	async delete(id: string): Promise<IServiceResponse> {
		const asset = await MediaAsset.findByPk(id)
		if (!asset) throw new NotFoundError('Media asset not found')

		if (asset.public_id) {
			await cloudinaryService.delete(asset.public_id, asset.type === 'VIDEO' ? 'video' : 'image')
		}

		await asset.destroy()
		return { statusCode: 200, payload: null, message: 'Media asset deleted successfully' }
	}
}

export const mediaAssetService = new MediaAssetService()
