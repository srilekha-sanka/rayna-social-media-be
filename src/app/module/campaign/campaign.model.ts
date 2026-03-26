import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'
import Product from '../product/product.model'
import User from '../user/user.model'

type CampaignGoal = 'SELL' | 'VALUE' | 'ENGAGEMENT'
type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

interface TargetAudience {
	age_range?: string
	geo?: string
	interests?: string[]
}

interface CampaignAttributes extends BaseAttributes {
	id: string
	name: string
	type: string
	goal: CampaignGoal
	target_audience: TargetAudience | null
	start_date: Date | null
	end_date: Date | null
	product_id: string | null
	status: CampaignStatus
	created_by: string
}

interface CampaignCreationAttributes
	extends Optional<CampaignAttributes, BaseModelType | 'target_audience' | 'start_date' | 'end_date' | 'product_id' | 'status'> {}

@Table({
	tableName: 'campaigns',
	modelName: 'Campaign',
	timestamps: true,
})
class Campaign extends BaseModel<CampaignAttributes, CampaignCreationAttributes> {
	@Column({
		type: DataType.STRING(500),
		allowNull: false,
	})
	name!: string

	@Column({
		type: DataType.STRING(255),
		allowNull: false,
	})
	type!: string

	@Column({
		type: DataType.ENUM('SELL', 'VALUE', 'ENGAGEMENT'),
		allowNull: false,
	})
	goal!: CampaignGoal

	@Column({
		type: DataType.JSONB,
		allowNull: true,
	})
	target_audience?: TargetAudience

	@Column({
		type: DataType.DATEONLY,
		allowNull: true,
	})
	start_date?: Date

	@Column({
		type: DataType.DATEONLY,
		allowNull: true,
	})
	end_date?: Date

	@ForeignKey(() => Product)
	@Column({
		type: DataType.UUID,
		allowNull: true,
	})
	product_id?: string

	@BelongsTo(() => Product)
	product!: Product

	@Column({
		type: DataType.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'),
		allowNull: false,
		defaultValue: 'DRAFT',
	})
	status!: CampaignStatus

	@ForeignKey(() => User)
	@Column({
		type: DataType.UUID,
		allowNull: false,
	})
	created_by!: string

	@BelongsTo(() => User)
	creator!: User
}

export default Campaign
