import 'reflect-metadata'
import express, { Express, Request, Response, ErrorRequestHandler } from 'express'
import { createServer } from 'http'
import { logger } from './app/common/logger/logging'
import { system } from './system/system'
import { ITokenPayload } from './app/interfaces/ITokenPayload'

// Express Server
const app: Express = express()

// Populate user in req object
declare global {
	namespace Express {
		interface Request {
			user: ITokenPayload
		}
	}
}

system.configure(app)

// HTTP Server
const server = createServer(app)

system.start(server)

app.get('/', (req: Request, res: Response) => {
	return res.send('Rayna Social API')
})

app.use((err: ErrorRequestHandler, req: Request, res: Response, next: any) => {
	logger.error(err)
	logger.error(`No route found for ${req.method} ${req.url}`)
	res.status(404).json({ code: 404, error: 'Route not found' })
})

;['uncaughtException', 'unhandledRejection'].forEach((event) =>
	process.on(event, (err: any) => {
		console.error(`Something bad happened! event: ${event}, msg: ${err.stack || err}`)
	})
)
