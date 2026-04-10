import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import Campaign from '../campaign/campaign.model'
import User from '../user/user.model'

type PostStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED'

interface PostAttributes extends BaseAttributes {
	id: string
	calendar_entry_id: string | null
	campaign_id: string | null
	author_id: string
	base_content: string | null
	hashtags: string[]
	cta_text: string | null
	platforms: string[]
	social_account_ids: string[]
	media_urls: string[]
	status: PostStatus
	scheduled_at: Date | null
	published_at: Date | null
	postforme_post_id: string | null
	approved_by: string | null
	approval_note: string | null
	rejection_reason: string | null
}

interface PostCreationAttributes
	extends Optional<
		PostAttributes,
		| BaseModelType
		| 'calendar_entry_id'
		| 'campaign_id'
		| 'base_content'
		| 'hashtags'
		| 'cta_text'
		| 'platforms'
		| 'social_account_ids'
		| 'media_urls'
		| 'status'
		| 'scheduled_at'
		| 'published_at'
		| 'postforme_post_id'
		| 'approved_by'
		| 'approval_note'
		| 'rejection_reason'
	> {}

@Table({
	tableName: 'posts',
	modelName: 'Post',
	timestamps: true,
})
class Post extends BaseModel<PostAttributes, PostCreationAttributes> {
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	calendar_entry_id?: string

	@ForeignKey(() => Campaign)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	campaign_id?: string

	@BelongsTo(() => Campaign)
	campaign!: Campaign

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	author_id!: string

	@BelongsTo(() => User)
	author!: User

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	base_content?: string

	@Column({
		type: DataType.ARRAY(DataType.STRING),
		allowNull: false,
		defaultValue: [],
	})
	hashtags!: string[]

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	cta_text?: string

	@Column({
		type: DataType.ARRAY(DataType.STRING),
		allowNull: false,
		defaultValue: [],
	})
	platforms!: string[]

	@Column({
		type: DataType.ARRAY(DataType.UUID),
		allowNull: false,
		defaultValue: [],
	})
	social_account_ids!: string[]

	@Column({
		type: DataType.ARRAY(DataType.STRING),
		allowNull: false,
		defaultValue: [],
	})
	media_urls!: string[]

	@Column({
		type: DataType.ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'),
		allowNull: false,
		defaultValue: 'DRAFT',
	})
	status!: PostStatus

	@Column({
		type: DataType.DATE,
		allowNull: true,
	})
	scheduled_at?: Date

	@Column({
		type: DataType.DATE,
		allowNull: true,
	})
	published_at?: Date

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	postforme_post_id?: string

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	approved_by?: string

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	approval_note?: string

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	rejection_reason?: string
}

export default Post
