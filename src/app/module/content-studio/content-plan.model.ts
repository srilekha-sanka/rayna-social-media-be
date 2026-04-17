import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import User from '../user/user.model'

export type ContentPlanStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'COMPLETED'

export const VALID_POST_TYPES = ['reel', 'image', 'carousel', 'cinematic_video', 'story', 'text'] as const
export type PostType = (typeof VALID_POST_TYPES)[number]

// Post types we currently support end-to-end (rendering, overlay, composition).
// Other VALID_POST_TYPES values are accepted at the schema level for forward-compat,
// but the content generator silently narrows to this subset.
export const SUPPORTED_POST_TYPES: readonly PostType[] = ['image', 'carousel']

interface ContentPlanAttributes extends BaseAttributes {
	id: string
	name: string
	start_date: Date
	end_date: Date
	status: ContentPlanStatus
	language: string
	post_types: PostType[]
	generation_config: object | null
	created_by: string
	approved_by: string | null
	approved_at: Date | null
}

interface ContentPlanCreationAttributes
	extends Optional<ContentPlanAttributes, BaseModelType | 'status' | 'language' | 'post_types' | 'generation_config' | 'approved_by' | 'approved_at'> {}

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
		type: DataType.STRING(50),
		allowNull: false,
		defaultValue: 'english',
	})
	language!: string

	@Column({
		type: DataType.ARRAY(DataType.STRING(50)),
		allowNull: false,
		defaultValue: VALID_POST_TYPES,
	})
	post_types!: PostType[]

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
