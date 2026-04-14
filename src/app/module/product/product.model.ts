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

	// ── New fields from enriched feed ──
	source_product_id: number | null
	product_type: string | null
	country: string | null
	city_id: number | null
	address: string | null
	latitude: number | null
	longitude: number | null
	avg_rating: number | null
	review_count: number | null
	duration: string | null
	pickup: string | null
	transport: string | null
	meals: string | null
	language: string | null
	group_size: string | null
	confirmation: string | null
	cancellation: string | null
	availability_status: string | null
	booking_url: string | null
	price_variant: string | null
	promotion_badge: string | null
	amenities_raw: string | null
	image_count: number | null

	// ── Additional enriched feed fields ──
	detail_title: string | null
	detail_share_url: string | null
	voucher: string | null
	total_price: number | null
	discount_percent: number | null
	discounted_price: number | null
	listing_amenities: string | null
	price_yacht_type: string | null
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
		| 'source_product_id'
		| 'product_type'
		| 'country'
		| 'city_id'
		| 'address'
		| 'latitude'
		| 'longitude'
		| 'avg_rating'
		| 'review_count'
		| 'duration'
		| 'pickup'
		| 'transport'
		| 'meals'
		| 'language'
		| 'group_size'
		| 'confirmation'
		| 'cancellation'
		| 'availability_status'
		| 'booking_url'
		| 'price_variant'
		| 'promotion_badge'
		| 'amenities_raw'
		| 'image_count'
		| 'detail_title'
		| 'detail_share_url'
		| 'voucher'
		| 'total_price'
		| 'discount_percent'
		| 'discounted_price'
		| 'listing_amenities'
		| 'price_yacht_type'
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

	// ── Source identity ──

	@Column({
		type: DataType.INTEGER,
		allowNull: true,
	})
	source_product_id?: number

	@Column({
		type: DataType.STRING(50),
		allowNull: true,
	})
	product_type?: string

	// ── Location ──

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	country?: string

	@Column({
		type: DataType.INTEGER,
		allowNull: true,
	})
	city_id?: number

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	address?: string

	@Column({
		type: DataType.DECIMAL(10, 7),
		allowNull: true,
	})
	latitude?: number

	@Column({
		type: DataType.DECIMAL(10, 7),
		allowNull: true,
	})
	longitude?: number

	// ── Ratings & reviews ──

	@Column({
		type: DataType.DECIMAL(3, 2),
		allowNull: true,
	})
	avg_rating?: number

	@Column({
		type: DataType.INTEGER,
		allowNull: true,
		defaultValue: 0,
	})
	review_count?: number

	// ── Amenities ──

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	duration?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	pickup?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	transport?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	meals?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	language?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	group_size?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	confirmation?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	cancellation?: string

	// ── Booking & pricing details ──

	@Column({
		type: DataType.STRING(50),
		allowNull: true,
	})
	availability_status?: string

	@Column({
		type: DataType.STRING(1000),
		allowNull: true,
	})
	booking_url?: string

	@Column({
		type: DataType.STRING(50),
		allowNull: true,
	})
	price_variant?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	promotion_badge?: string

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	amenities_raw?: string

	@Column({
		type: DataType.INTEGER,
		allowNull: true,
		defaultValue: 0,
	})
	image_count?: number

	// ── Additional enriched feed fields ──

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	detail_title?: string

	@Column({
		type: DataType.STRING(1000),
		allowNull: true,
	})
	detail_share_url?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	voucher?: string

	@Column({
		type: DataType.DECIMAL(10, 2),
		allowNull: true,
	})
	total_price?: number

	@Column({
		type: DataType.DECIMAL(5, 2),
		allowNull: true,
	})
	discount_percent?: number

	@Column({
		type: DataType.DECIMAL(10, 2),
		allowNull: true,
	})
	discounted_price?: number

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	listing_amenities?: string

	@Column({
		type: DataType.STRING(100),
		allowNull: true,
	})
	price_yacht_type?: string
}

export default Product
