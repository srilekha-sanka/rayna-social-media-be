import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import User from '../user/user.model'

type SocialPlatform =
	| 'facebook'
	| 'instagram'
	| 'x'
	| 'linkedin'
	| 'tiktok'
	| 'youtube'
	| 'pinterest'
	| 'threads'
	| 'bluesky'
	| 'google_business'

type AccountStatus = 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED' | 'PENDING'

interface SocialAccountAttributes extends BaseAttributes {
	id: string
	platform: SocialPlatform
	postforme_account_id: string | null
	display_name: string | null
	username: string | null
	avatar_url: string | null
	platform_user_id: string | null
	status: AccountStatus
	connected_at: Date | null
	connected_by: string
	meta: object | null
}

interface SocialAccountCreationAttributes
	extends Optional<
		SocialAccountAttributes,
		| BaseModelType
		| 'postforme_account_id'
		| 'display_name'
		| 'username'
		| 'avatar_url'
		| 'platform_user_id'
		| 'status'
		| 'connected_at'
		| 'meta'
	> {}

@Table({
	tableName: 'social_accounts',
	modelName: 'SocialAccount',
	timestamps: true,
})
class SocialAccount extends BaseModel<SocialAccountAttributes, SocialAccountCreationAttributes> {
	@Column({
		type: DataType.ENUM(
			'facebook',
			'instagram',
			'x',
			'linkedin',
			'tiktok',
			'youtube',
			'pinterest',
			'threads',
			'bluesky',
			'google_business'
		),
		allowNull: false,
	})
	platform!: SocialPlatform

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	postforme_account_id?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	display_name?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	username?: string

	@Column({
		type: DataType.STRING(1000),
		allowNull: true,
	})
	avatar_url?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	platform_user_id?: string

	@Column({
		type: DataType.ENUM('CONNECTED', 'EXPIRED', 'DISCONNECTED', 'PENDING'),
		allowNull: false,
		defaultValue: 'PENDING',
	})
	status!: AccountStatus

	@Column({
		type: DataType.DATE,
		allowNull: true,
	})
	connected_at?: Date

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	connected_by!: string

	@BelongsTo(() => User)
	connector!: User

	@Column({
		type: DataType.JSONB,
		allowNull: true,
	})
	meta?: object
}

export default SocialAccount
