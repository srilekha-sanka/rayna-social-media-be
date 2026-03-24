import { Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript'

/* BaseModel for default table fields */
@Table({ paranoid: true, deletedAt: 'deleted_at' })
abstract class BaseModel<TAttributes extends {}, TCreationAttributes extends {}> extends Model<
	TAttributes,
	TCreationAttributes
> {
	@PrimaryKey
	@Column({
		type: DataType.UUID,
		allowNull: false,
		defaultValue: DataType.UUIDV4,
	})
	id!: string

	@CreatedAt
	@Column({ type: DataType.DATE, defaultValue: DataType.NOW, allowNull: false })
	createdAt!: Date

	@UpdatedAt
	@Column({ type: DataType.DATE, defaultValue: DataType.NOW, allowNull: false })
	updatedAt!: Date

	@Column({
		type: DataType.BOOLEAN,
		defaultValue: true,
	})
	is_active!: boolean
}

export default BaseModel
