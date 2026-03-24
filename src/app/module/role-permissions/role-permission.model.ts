import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import Role from '../role/role.model'
import Resource from '../resource/resource.model'

interface RolePermissionAttributes extends BaseAttributes {
	id: string
	role_id: string
	resource_id: string
	create: boolean
	read: boolean
	revise: boolean
	remove: boolean
	root: boolean
}

interface RolePermissionCreationAttributes
	extends Optional<RolePermissionAttributes, BaseModelType | 'create' | 'read' | 'revise' | 'remove' | 'root'> {}

@Table({
	tableName: 'role_permissions',
	modelName: 'RolePermission',
	timestamps: true,
})
class RolePermission extends BaseModel<RolePermissionAttributes, RolePermissionCreationAttributes> {
	@ForeignKey(() => Role)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	role_id!: string

	@ForeignKey(() => Resource)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	resource_id!: string

	@Column({
		type: DataType.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	})
	create!: boolean

	@Column({
		type: DataType.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	})
	read!: boolean

	@Column({
		type: DataType.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	})
	revise!: boolean

	@Column({
		type: DataType.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	})
	remove!: boolean

	@Column({
		type: DataType.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	})
	root!: boolean

	@BelongsTo(() => Role)
	role!: Role

	@BelongsTo(() => Resource)
	resource!: Resource
}

export default RolePermission
