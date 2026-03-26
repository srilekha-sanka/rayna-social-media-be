import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import User from '../user/user.model'

interface InstagramCredentialAttributes extends BaseAttributes {
	id: string
	ig_user_id: string
	access_token: string
	token_type: string
	saved_by: string
}

interface InstagramCredentialCreationAttributes
	extends Optional<InstagramCredentialAttributes, BaseModelType | 'token_type'> {}

@Table({
	tableName: 'instagram_credentials',
	modelName: 'InstagramCredential',
	timestamps: true,
})
class InstagramCredential extends BaseModel<InstagramCredentialAttributes, InstagramCredentialCreationAttributes> {
	@Column({
		type: DataType.STRING(255),
		allowNull: false,
	})
	ig_user_id!: string

	@Column({
		type: DataType.TEXT,
		allowNull: false,
	})
	access_token!: string

	@Column({
		type: DataType.STRING(50),
		allowNull: false,
		defaultValue: 'long_lived',
	})
	token_type!: string

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	saved_by!: string

	@BelongsTo(() => User)
	user!: User
}

export default InstagramCredential
