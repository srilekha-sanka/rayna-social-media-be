import dotenv from 'dotenv'
dotenv.config()

export const env = Object.freeze({
	nodeEnv: process.env.NODE_ENV || 'development',
	port: parseInt(process.env.PORT || '3000', 10),
	db: {
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '5432', 10),
		name: process.env.DB_NAME || 'rayna_social',
		user: process.env.DB_USER || 'postgres',
		password: process.env.DB_PASSWORD || 'postgres',
	},
	jwt: {
		accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
		refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
		accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
		refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
	},
	openai: {
		apiKey: process.env.OPENAI_API_KEY || '',
		model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
	},
	outstand: {
		apiKey: process.env.OUTSTAND_API_KEY || '',
		baseUrl: process.env.OUTSTAND_BASE_URL || 'https://api.outstand.so/v1',
	},
	cloudinary: {
		cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
		apiKey: process.env.CLOUDINARY_API_KEY || '',
		apiSecret: process.env.CLOUDINARY_API_SECRET || '',
	},
	instagram: {
		appId: process.env.INSTAGRAM_APP_ID || '',
		appSecret: process.env.INSTAGRAM_APP_SECRET || '',
	},
	freepik: {
		apiKey: process.env.FREEPIK_API_KEY || '',
	},
})
