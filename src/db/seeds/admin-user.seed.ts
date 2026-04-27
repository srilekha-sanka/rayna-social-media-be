import bcrypt from 'bcryptjs'
import { logger } from '../../app/common/logger/logging'
import Role from '../../app/module/role/role.model'
import User from '../../app/module/user/user.model'

const SALT_ROUNDS = 12

export async function seedAdminUser() {
	// 1. Upsert ADMIN role
	const [adminRole] = await Role.findOrCreate({
		where: { name: 'ADMIN' },
		defaults: { name: 'ADMIN' },
	})

	// 2. Upsert USER role (so regular registration works too)
	await Role.findOrCreate({
		where: { name: 'USER' },
		defaults: { name: 'USER' },
	})

	// 3. Seed admin user if not exists
	const existing = await User.findOne({ where: { email: 'admin@raynatours.com' } })

	if (existing) {
		// Ensure existing admin has ADMIN role
		if (existing.role_id !== adminRole.id) {
			await existing.update({ role_id: adminRole.id })
			logger.info('[Seed] Updated admin@raynatours.com role to ADMIN')
		} else {
			logger.info('[Seed] Admin user already exists, skipping.')
		}
		return
	}

	const hashedPassword = await bcrypt.hash('Admin@1234', SALT_ROUNDS)

	await User.create({
		email: 'admin@raynatours.com',
		password: hashedPassword,
		first_name: 'Admin',
		role_id: adminRole.id,
	})

	logger.info('[Seed] Admin user created: admin@raynatours.com')
}
