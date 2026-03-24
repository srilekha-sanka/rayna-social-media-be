import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import Role from '../role/role.model'

interface UserAttributes extends BaseAttributes {
	id: string
	email: string
	password: string
	first_name: string
	last_name?: string | null
	role_id?: string | null
	refresh_token?: string | null
}

interface UserCreationAttributes extends Optional<UserAttributes, BaseModelType | 'role_id' | 'refresh_token' | 'last_name'> {}

@Table({
	tableName: 'users',
	modelName: 'User',
	timestamps: true,
})
class User extends BaseModel<UserAttributes, UserCreationAttributes> {
	@Column({
		type: DataType.STRING(255),
		allowNull: false,
		unique: true,
	})
	email!: string

	@Column({
		type: DataType.STRING(255),
		allowNull: false,
	})
	password!: string

	@Column({
		type: DataType.STRING(255),
		allowNull: false,
	})
	first_name!: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	last_name?: string

	@ForeignKey(() => Role)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	role_id?: string

	@BelongsTo(() => Role)
	role!: Role

	@Column({
		type: DataType.TEXT,
		allowNull: true,
	})
	refresh_token?: string
}

export default User
