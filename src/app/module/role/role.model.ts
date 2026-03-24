import { Table, Column, DataType, HasMany } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import RolePermission from '../role-permissions/role-permission.model'

interface RoleAttributes extends BaseAttributes {
	id: string
	name: string
}

interface RoleCreationAttributes extends Optional<RoleAttributes, BaseModelType> {}

@Table({
	tableName: 'roles',
	modelName: 'Role',
	timestamps: true,
})
class Role extends BaseModel<RoleAttributes, RoleCreationAttributes> {
	@Column({
		type: DataType.STRING(100),
		allowNull: false,
		unique: true,
	})
	name!: string

	@HasMany(() => RolePermission)
	permissions!: RolePermission[]
}

export default Role
