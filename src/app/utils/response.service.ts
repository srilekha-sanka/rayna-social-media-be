import { Response } from 'express'

class ResponseService {
	sendResponse(res: Response, statusCode: number, payload: any, message: string) {
		return res.status(statusCode).json({
			success: statusCode < 400,
			message,
			data: payload,
		})
	}
}

export default ResponseService
