import { Table, Column, DataType } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'

interface ProductAttributes extends BaseAttributes {
	id: string
	name: string
	description: string
	short_description: string | null
	price: number
	compare_at_price: number | null
	currency: string
	offer_label: string | null
	category: string | null
	city: string | null
	base_url: string | null
	image_urls: string[]
	highlights: string[]
	meta: object | null
}

interface ProductCreationAttributes
	extends Optional<
		ProductAttributes,
		| BaseModelType
		| 'short_description'
		| 'compare_at_price'
		| 'currency'
		| 'offer_label'
		| 'category'
		| 'city'
		| 'base_url'
		| 'image_urls'
		| 'highlights'
		| 'meta'
	> {}

@Table({
	tableName: 'products',
	modelName: 'Product',
	timestamps: true,
})
class Product extends BaseModel<ProductAttributes, ProductCreationAttributes> {
	@Column({
		type: DataType.STRING(500),
		allowNull: false,
	})
	name!: string

	@Column({
		type: DataType.TEXT,
		allowNull: false,
	})
	description!: string

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	short_description?: string

	@Column({
		type: DataType.DECIMAL(10, 2),
		allowNull: false,
	})
	price!: number

	@Column({
		type: DataType.DECIMAL(10, 2),
		allowNull: true,
	})
	compare_at_price?: number

	@Column({
		type: DataType.STRING(10),
		allowNull: false,
		defaultValue: 'AED',
	})
	currency!: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	offer_label?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	category?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	city?: string

	@Column({
		type: DataType.STRING(1000),
		allowNull: true,
	})
	base_url?: string

	@Column({
		type: DataType.ARRAY(DataType.STRING),
		allowNull: false,
		defaultValue: [],
	})
	image_urls!: string[]

	@Column({
		type: DataType.ARRAY(DataType.STRING),
		allowNull: false,
		defaultValue: [],
	})
	highlights!: string[]

	@Column({
		type: DataType.JSONB,
		allowNull: true,
	})
	meta?: object
}

export default Product
