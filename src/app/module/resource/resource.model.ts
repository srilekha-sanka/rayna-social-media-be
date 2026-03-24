import { Table, Column, DataType, HasMany } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import RolePermission from '../role-permissions/role-permission.model'


interface ResourceAttributes extends BaseAttributes {
	id: string
	name: string
}

interface ResourceCreationAttributes extends Optional<ResourceAttributes, BaseModelType> {}

@Table({
	tableName: 'resources',
	modelName: 'Resource',
	timestamps: true,
})
class Resource extends BaseModel<ResourceAttributes, ResourceCreationAttributes> {
	@Column({
		type: DataType.STRING(100),
		allowNull: false,
		unique: true,
	})
	name!: string

	@HasMany(() => RolePermission)
	permissions!: RolePermission[]
}

export default Resource
