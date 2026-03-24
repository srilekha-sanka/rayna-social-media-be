import { Request, Response, NextFunction } from 'express'
import roleService from './role.service'
import ResponseService from '../../utils/response.service'

class RoleController extends ResponseService {
	constructor() {
		super()
	}

	syncPermissions = async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await roleService.syncPermissionsFromSheet()
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getAllRoles = async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const { statusCode, payload, message } = await roleService.getAllRoles()
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}

	getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { roleName } = req.params
			const { statusCode, payload, message } = await roleService.getRolePermissions(roleName)
			return this.sendResponse(res, statusCode, payload, message)
		} catch (err) {
			next(err)
		}
	}
}

export default new RoleController()
