import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express, { Express } from 'express'
import helmet from 'helmet'
import * as http from 'http'
import morgan from 'morgan'
import path from 'path'
import { logger } from '../app/common/logger/logging'
import dbConnSeq from '../db/config/database.config'
import { errorHandler } from '../app/middlewares/commonErrorHandler'
import routes from '../app/routes'
import { seedProductsFromFeed } from '../app/module/product/product-sync.service'
import { seedDesignTemplates } from '../db/seeds/design-template.seed'

let routingUrl = '/api/v1'

export class System {
	configure = (app: Express) => {
		dotenv.config()
		app.use(
			cors({
				credentials: true,
			})
		)
		app.use(express.static(__dirname + '/public'))
		app.use('/uploads', express.static(path.resolve('./uploads')))
		app.use(helmet())
		app.disable('x-powered-by')
		app.use(compression())
		app.use(morgan('dev'))
		app.use(express.json())
		app.use(cookieParser())
		app.use(express.urlencoded({ extended: true }))
		app.use((req, res, next) => {
			res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
			res.setHeader('Pragma', 'no-cache')
			res.setHeader('Expires', '0')
			next()
		})
		app.use(routingUrl, routes)
		app.use(errorHandler)
	}

	start = (app: http.Server) => {
		try {
			// Add 'canvas' to the renderer ENUM before sync (PostgreSQL won't auto-add ENUM values)
			// dbConnSeq.query(
			// 	`DO $$ BEGIN
			// 		ALTER TYPE "enum_design_templates_renderer" ADD VALUE IF NOT EXISTS 'canvas';
			// 	EXCEPTION WHEN duplicate_object THEN NULL;
			// 	END $$;`
			// ).catch(() => { /* ENUM may not exist yet on first run */ })

			dbConnSeq
				.sync({ alter: true, logging: false })
				.then(async () => {
					logger.info('📁[DB]: Database is connected and synced.')
					await seedProductsFromFeed()
					await seedDesignTemplates()
					const port: number = process.env.PORT ? +process.env.PORT : 3000
					app.listen(port, async () => {
						logger.info('----------------------------------------------------------')
						logger.info(`⚡️[server]: Server is running on ${port}`)
						logger.info('Time : ' + new Date())
						logger.info('----------------------------------------------------------')
					})
				})
				.catch((err) => {
					logger.error('Error-> ', err)
				})
		} catch (error) {
			logger.error('📁[DB] & ⚡️[server]: Error synchronizing database or while running server:', error)
		}
	}
}

export const system = new System()
