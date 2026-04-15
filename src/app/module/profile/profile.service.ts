import User from '../user/user.model'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { NotFoundError } from '../../errors/api-errors'
import { cloudinaryService } from '../cloudinary/cloudinary.service'
import fs from 'fs'

const PROFILE_FIELDS = ['id', 'email', 'first_name', 'last_name', 'title', 'timezone', 'bio', 'profile_photo', 'createdAt', 'updatedAt'] as const

class ProfileService {
	async getProfile(userId: string): Promise<IServiceResponse> {
		const user = await User.findByPk(userId, {
			attributes: [...PROFILE_FIELDS],
		})

		if (!user) throw new NotFoundError('User not found')

		return { statusCode: 200, payload: user, message: 'Profile fetched successfully' }
	}

	async updateProfile(
		userId: string,
		data: { first_name?: string; last_name?: string; title?: string; timezone?: string; bio?: string }
	): Promise<IServiceResponse> {
		const user = await User.findByPk(userId)
		if (!user) throw new NotFoundError('User not found')

		await user.update(data)

		const profile = await User.findByPk(userId, {
			attributes: [...PROFILE_FIELDS],
		})

		return { statusCode: 200, payload: profile, message: 'Profile updated successfully' }
	}

	async updatePhoto(userId: string, file: Express.Multer.File): Promise<IServiceResponse> {
		const user = await User.findByPk(userId)
		if (!user) throw new NotFoundError('User not found')

		const result = await cloudinaryService.upload(file.path, {
			folder: 'rayna/avatars',
			publicId: `user-${userId}`,
			resourceType: 'image',
		})

		// Clean up local temp file
		fs.unlink(file.path, () => {})

		await user.update({ profile_photo: result.secure_url })

		const profile = await User.findByPk(userId, {
			attributes: [...PROFILE_FIELDS],
		})

		return { statusCode: 200, payload: profile, message: 'Profile photo updated successfully' }
	}

	async removePhoto(userId: string): Promise<IServiceResponse> {
		const user = await User.findByPk(userId)
		if (!user) throw new NotFoundError('User not found')

		if (user.profile_photo) {
			await cloudinaryService.delete(`rayna/avatars/user-${userId}`)
		}

		await user.update({ profile_photo: null })

		const profile = await User.findByPk(userId, {
			attributes: [...PROFILE_FIELDS],
		})

		return { statusCode: 200, payload: profile, message: 'Profile photo removed successfully' }
	}
}

export const profileService = new ProfileService()
