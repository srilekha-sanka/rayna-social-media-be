import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import Product from '../product/product.model'

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO'
type MediaSource = 'UPLOADED' | 'AI_GENERATED' | 'PRODUCT_FETCH' | 'OVERLAY'

interface MediaAssetAttributes extends BaseAttributes {
	id: string
	type: MediaType
	source: MediaSource
	file_path: string
	file_name: string
	file_size: number | null
	mime_type: string | null
	dimensions: { width: number; height: number } | null
	product_id: string | null
}

interface MediaAssetCreationAttributes
	extends Optional<MediaAssetAttributes, BaseModelType | 'file_size' | 'mime_type' | 'dimensions' | 'product_id'> {}

@Table({
	tableName: 'media_assets',
	modelName: 'MediaAsset',
	timestamps: true,
})
class MediaAsset extends BaseModel<MediaAssetAttributes, MediaAssetCreationAttributes> {
	@Column({
		type: DataType.ENUM('IMAGE', 'VIDEO', 'AUDIO'),
		allowNull: false,
	})
	type!: MediaType

	@Column({
		type: DataType.ENUM('UPLOADED', 'AI_GENERATED', 'PRODUCT_FETCH', 'OVERLAY'),
		allowNull: false,
		defaultValue: 'UPLOADED',
	})
	source!: MediaSource

	@Column({
		type: DataType.STRING(1000),
		allowNull: false,
	})
	file_path!: string

	@Column({
		type: DataType.STRING(500),
		allowNull: false,
	})
	file_name!: string

	@Column({
		type: DataType.INTEGER,
		allowNull: true,
	})
	file_size?: number

	@Column({
		type: DataType.STRING(100),
		allowNull: true,
	})
	mime_type?: string

	@Column({
		type: DataType.JSONB,
		allowNull: true,
	})
	dimensions?: { width: number; height: number }

	@ForeignKey(() => Product)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	product_id?: string

	@BelongsTo(() => Product)
	product!: Product
}

export default MediaAsset
