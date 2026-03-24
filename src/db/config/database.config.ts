import { Sequelize } from 'sequelize-typescript'
import { env } from './env.config'
import User from '../../app/module/user/user.model'
import Role from '../../app/module/role/role.model'
import Resource from '../../app/module/resource/resource.model'
import RolePermission from '../../app/module/role-permissions/role-permission.model'

const sequelize = new Sequelize({
	database: env.db.name,
	username: env.db.user,
	password: env.db.password,
	host: env.db.host,
	port: env.db.port,
	dialect: 'postgres',
	logging: env.nodeEnv === 'development' ? console.log : false,
	models: [User, Role, Resource, RolePermission],
	define: {
		timestamps: true,
		underscored: true,
	},
})

export default sequelize
