import { Sequelize } from 'sequelize-typescript'
import { env } from './env.config'
import User from '../../app/module/user/user.model'
import Role from '../../app/module/role/role.model'
import Resource from '../../app/module/resource/resource.model'
import RolePermission from '../../app/module/role-permissions/role-permission.model'
import Product from '../../app/module/product/product.model'
import MediaAsset from '../../app/module/media-asset/media-asset.model'
import Campaign from '../../app/module/campaign/campaign.model'
import Post from '../../app/module/post/post.model'
import Brand from '../../app/module/brand/brand.model'
import SocialAccount from '../../app/module/social-account/social-account.model'

const sequelize = new Sequelize({
	database: env.db.name,
	username: env.db.user,
	password: env.db.password,
	host: env.db.host,
	port: env.db.port,
	dialect: 'postgres',
	logging: env.nodeEnv === 'development' ? console.log : false,
	models: [User, Role, Resource, RolePermission, Product, MediaAsset, Campaign, Post, Brand, SocialAccount],
	define: {
		timestamps: true,
		underscored: true,
	},
})

export default sequelize
