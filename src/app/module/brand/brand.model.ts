import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import User from '../user/user.model'

interface BrandAttributes extends BaseAttributes {
	id: string
	name: string
	logo_url: string | null
	website: string | null
	industry: string | null
	timezone: string
	created_by: string
}

interface BrandCreationAttributes
	extends Optional<BrandAttributes, BaseModelType | 'logo_url' | 'website' | 'industry' | 'timezone'> {}

@Table({
	tableName: 'brands',
	modelName: 'Brand',
	timestamps: true,
})
class Brand extends BaseModel<BrandAttributes, BrandCreationAttributes> {
	@Column({
		type: DataType.STRING(255),
		allowNull: false,
	})
	name!: string

	@Column({
		type: DataType.STRING(1000),
		allowNull: true,
	})
	logo_url?: string

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	website?: string

	@Column({
		type: DataType.STRING(255),
		allowNull: true,
	})
	industry?: string

	@Column({
		type: DataType.STRING(100),
		allowNull: false,
		defaultValue: 'Asia/Dubai',
	})
	timezone!: string

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	created_by!: string

	@BelongsTo(() => User)
	creator!: User
}

export default Brand
