import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import Post from '../post/post.model'
import SocialAccount from '../social-account/social-account.model'

interface PostAnalyticsAttributes extends BaseAttributes {
	id: string
	post_id: string
	platform: string
	social_account_id: string | null
	platform_post_id: string | null
	platform_post_url: string | null

	// Engagement metrics
	likes: number
	comments: number
	shares: number
	saves: number
	reach: number
	impressions: number
	clicks: number
	engagement_rate: number

	// Video-specific
	video_views: number
	watch_time_seconds: number

	// Raw data from PostForMe (future-proof for new metrics)
	raw_metrics: object | null

	// Sync tracking
	last_synced_at: Date
}

interface PostAnalyticsCreationAttributes
	extends Optional<
		PostAnalyticsAttributes,
		| BaseModelType
		| 'social_account_id'
		| 'platform_post_id'
		| 'platform_post_url'
		| 'likes'
		| 'comments'
		| 'shares'
		| 'saves'
		| 'reach'
		| 'impressions'
		| 'clicks'
		| 'engagement_rate'
		| 'video_views'
		| 'watch_time_seconds'
		| 'raw_metrics'
		| 'last_synced_at'
	> {}

@Table({
	tableName: 'post_analytics',
	modelName: 'PostAnalytics',
	timestamps: true,
	indexes: [
		{ fields: ['post_id', 'platform'], unique: true },
		{ fields: ['post_id'] },
		{ fields: ['platform'] },
		{ fields: ['last_synced_at'] },
	],
})
class PostAnalytics extends BaseModel<PostAnalyticsAttributes, PostAnalyticsCreationAttributes> {
	@ForeignKey(() => Post)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	post_id!: string

	@BelongsTo(() => Post)
	post!: Post

	@Column({
		type: DataType.STRING(50),
		allowNull: false,
	})
	platform!: string

	@ForeignKey(() => SocialAccount)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	social_account_id?: string

	@BelongsTo(() => SocialAccount)
	socialAccount?: SocialAccount

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	platform_post_id?: string

	@Column({
		type: DataType.STRING(1000),
		allowNull: true,
	})
	platform_post_url?: string

	// ── Engagement Metrics ────────────────────────────────────────────

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	likes!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	comments!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	shares!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	saves!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	reach!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	impressions!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	clicks!: number

	@Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 0 })
	engagement_rate!: number

	// ── Video-specific ────────────────────────────────────────────────

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	video_views!: number

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	watch_time_seconds!: number

	// ── Raw Data ──────────────────────────────────────────────────────

	@Column({ type: DataType.JSONB, allowNull: true })
	raw_metrics?: object

	// ── Sync Tracking ─────────────────────────────────────────────────

	@Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
	last_synced_at!: Date
}

export default PostAnalytics
