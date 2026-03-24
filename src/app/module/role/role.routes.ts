import { Router } from 'express'
import roleController from './role.controller'

const roleRouter = Router()

roleRouter.post('/sync', roleController.syncPermissions)
roleRouter.get('/', roleController.getAllRoles)
roleRouter.get('/:roleName', roleController.getRolePermissions)

export { roleRouter }
