export interface BaseAttributes {
	id: string
	createdAt: Date
	updatedAt: Date
	is_active: boolean
	deleted_at: Date | null
}

export type BaseModelType = 'id' | 'is_active' | 'deleted_at' | 'createdAt' | 'updatedAt'
