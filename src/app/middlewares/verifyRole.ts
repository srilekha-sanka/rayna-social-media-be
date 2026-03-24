import { Request, Response, NextFunction } from 'express'
import { AccessForbiddenError } from '../errors/api-errors'
import RolePermission from '../module/role-permissions/role-permission.model'
import Resource from '../module/resource/resource.model'
import Role from '../module/role/role.model'

type PermissionAction = 'create' | 'read' | 'revise' | 'remove' | 'root'

/**
 * Checks if the authenticated user's role has the required permission
 * on a given resource.
 *
 * Usage in routes:
 *   verifyPermission('users', 'create')
 *   verifyPermission('orders', 'read')
 */
export const verifyPermission = (resourceName: string, action: PermissionAction) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			const user = (req as any).userData

			if (!user || !user.role_id) {
				return next(new AccessForbiddenError('No role assigned'))
			}

			const permission = await RolePermission.findOne({
				where: { role_id: user.role_id },
				include: [
					{
						model: Resource,
						where: { name: resourceName },
					},
				],
			})

			if (!permission || !permission[action]) {
				return next(new AccessForbiddenError(`No '${action}' permission on '${resourceName}'`))
			}

			next()
		} catch (err) {
			next(new AccessForbiddenError('Permission check failed'))
		}
	}
}

/**
 * Simple role name check — verifies user belongs to one of the allowed roles.
 *
 * Usage in routes:
 *   verifyRole('ADMIN')
 *   verifyRole('ADMIN', 'MODERATOR')
 */
export const verifyRole = (...allowedRoles: string[]) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			const user = (req as any).userData

			if (!user || !user.role_id) {
				return next(new AccessForbiddenError('No role assigned'))
			}

			const role = await Role.findByPk(user.role_id)

			if (!role || !allowedRoles.includes(role.name)) {
				return next(new AccessForbiddenError('Insufficient permissions'))
			}

			next()
		} catch (err) {
			next(new AccessForbiddenError('Role check failed'))
		}
	}
}
