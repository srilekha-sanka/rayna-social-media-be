import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import ContentPlan from './content-plan.model'
import Campaign from '../campaign/campaign.model'
import Product from '../product/product.model'
import Post from '../post/post.model'

export type EntryContentType = 'PRODUCT_PROMO' | 'FESTIVAL_GREETING' | 'ENGAGEMENT' | 'VALUE' | 'BRAND_AWARENESS'
export type EntryStatus = 'SUGGESTED' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'SKIPPED'

interface CalendarEntryAttributes extends BaseAttributes {
	id: string
	content_plan_id: string
	date: Date
	title: string
	description: string | null
	content_type: EntryContentType
	platform: string
	product_id: string | null
	campaign_id: string | null
	post_id: string | null
	media_urls: string[]
	status: EntryStatus
	scheduled_at: Date | null
	ai_rationale: string | null
}

interface CalendarEntryCreationAttributes
	extends Optional<
		CalendarEntryAttributes,
		BaseModelType | 'description' | 'product_id' | 'campaign_id' | 'post_id' | 'media_urls' | 'status' | 'scheduled_at' | 'ai_rationale'
	> {}

@Table({
	tableName: 'calendar_entries',
	modelName: 'CalendarEntry',
	timestamps: true,
})
class CalendarEntry extends BaseModel<CalendarEntryAttributes, CalendarEntryCreationAttributes> {
	@ForeignKey(() => ContentPlan)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	content_plan_id!: string

	@BelongsTo(() => ContentPlan)
	content_plan!: ContentPlan

	@Column({
		type: DataType.DATEONLY,
		allowNull: false,
	})
	date!: Date

	@Column({
		type: DataType.STRING(500),
		allowNull: false,
	})
	title!: string

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	description?: string

	@Column({
		type: DataType.ENUM('PRODUCT_PROMO', 'FESTIVAL_GREETING', 'ENGAGEMENT', 'VALUE', 'BRAND_AWARENESS'),
		allowNull: false,
	})
	content_type!: EntryContentType

	@Column({
		type: DataType.STRING(50),
		allowNull: false,
	})
	platform!: string

	@ForeignKey(() => Product)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	product_id?: string

	@BelongsTo(() => Product)
	product!: Product

	@ForeignKey(() => Campaign)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	campaign_id?: string

	@BelongsTo(() => Campaign)
	campaign!: Campaign

	@ForeignKey(() => Post)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	post_id?: string

	@BelongsTo(() => Post)
	post!: Post

	@Column({
		type: DataType.ARRAY(DataType.STRING),
		allowNull: false,
		defaultValue: [],
	})
	media_urls!: string[]

	@Column({
		type: DataType.ENUM('SUGGESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'SKIPPED'),
		allowNull: false,
		defaultValue: 'SUGGESTED',
	})
	status!: EntryStatus

	@Column({
		type: DataType.DATE,
		allowNull: true,
	})
	scheduled_at?: Date

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	ai_rationale?: string
}

export default CalendarEntry
