import { Table, Column, DataType } from 'sequelize-typescript'
import { Optional } from 'sequelize'
import BaseModel from '../../utils/base.model'
import { BaseAttributes, BaseModelType } from '../../interfaces/BaseAttributes'

export type MediaType = 'image' | 'video'
export type RendererType = 'html' | 'canvas'

export interface PromptConfig {
	design_prompt: string
	dynamic_fields: string[]
}

interface DesignTemplateAttributes extends BaseAttributes {
	id: string
	name: string
	slug: string
	description: string
	media_type: MediaType
	renderer: RendererType
	thumbnail_url: string | null
	prompt_config: PromptConfig
	sort_order: number
}

interface DesignTemplateCreationAttributes
	extends Optional<DesignTemplateAttributes, BaseModelType | 'media_type' | 'renderer' | 'thumbnail_url' | 'sort_order'> {}

@Table({
	tableName: 'design_templates',
	modelName: 'DesignTemplate',
	timestamps: true,
})
class DesignTemplate extends BaseModel<DesignTemplateAttributes, DesignTemplateCreationAttributes> {
	@Column({
		type: DataType.STRING(100),
		allowNull: false,
	})
	name!: string

	@Column({
		type: DataType.STRING(100),
		allowNull: false,
		unique: true,
	})
	slug!: string

	@Column({
		type: DataType.TEXT,
		allowNull: false,
	})
	description!: string

	@Column({
		type: DataType.ENUM('image', 'video'),
		allowNull: false,
		defaultValue: 'image',
	})
	media_type!: MediaType

	@Column({
		type: DataType.ENUM('html', 'canvas'),
		allowNull: false,
		defaultValue: 'html',
	})
	renderer!: RendererType

	@Column({
		type: DataType.STRING(500),
		allowNull: true,
	})
	thumbnail_url?: string

	@Column({
		type: DataType.JSONB,
		allowNull: false,
	})
	prompt_config!: PromptConfig

	@Column({
		type: DataType.INTEGER,
		allowNull: false,
		defaultValue: 0,
	})
	sort_order!: number
}

export default DesignTemplate
