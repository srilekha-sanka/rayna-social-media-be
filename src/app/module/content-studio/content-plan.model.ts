import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import User from '../user/user.model'
import Brand from '../brand/brand.model'

export type ContentPlanStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'COMPLETED'

interface ContentPlanAttributes extends BaseAttributes {
	id: string
	name: string
	brand_id: string | null
	start_date: Date
	end_date: Date
	status: ContentPlanStatus
	generation_config: object | null
	created_by: string
	approved_by: string | null
	approved_at: Date | null
}

interface ContentPlanCreationAttributes
	extends Optional<ContentPlanAttributes, BaseModelType | 'brand_id' | 'status' | 'generation_config' | 'approved_by' | 'approved_at'> {}

@Table({
	tableName: 'content_plans',
	modelName: 'ContentPlan',
	timestamps: true,
})
class ContentPlan extends BaseModel<ContentPlanAttributes, ContentPlanCreationAttributes> {
	@Column({
		type: DataType.STRING(500),
		allowNull: false,
	})
	name!: string

	@ForeignKey(() => Brand)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	brand_id?: string

	@BelongsTo(() => Brand)
	brand!: Brand

	@Column({
		type: DataType.DATEONLY,
		allowNull: false,
	})
	start_date!: Date

	@Column({
		type: DataType.DATEONLY,
		allowNull: false,
	})
	end_date!: Date

	@Column({
		type: DataType.ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED'),
		allowNull: false,
		defaultValue: 'DRAFT',
	})
	status!: ContentPlanStatus

	@Column({
		type: DataType.JSONB,
		allowNull: true,
	})
	generation_config?: object

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	created_by!: string

	@BelongsTo(() => User, 'created_by')
	creator!: User

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	approved_by?: string

	@Column({
		type: DataType.DATE,
		allowNull: true,
	})
	approved_at?: Date
}

export default ContentPlan
