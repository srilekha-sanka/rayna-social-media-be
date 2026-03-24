import csvParser from 'csv-parser'
import { Op } from 'sequelize'
import { Readable } from 'stream'
import { IServiceResponse } from '../../interfaces/IServiceResponse'
import { BadRequestError } from '../../errors/api-errors'
import Role from './role.model'
import Resource from '../resource/resource.model'
import RolePermission from '../role-permissions/role-permission.model'

class RoleService {
	/**
	 * Syncs roles, resources, and permissions from a published Google Sheet CSV.
	 *
	 * Expected CSV columns: role, resource, create, read, revise, remove, root
	 * Values for permission columns: TRUE / FALSE
	 */
	async syncPermissionsFromSheet(): Promise<IServiceResponse> {
		const csvUrl = process.env.RBAC_PERMISSIONS_CSV_URL

		if (!csvUrl) {
			throw new BadRequestError('RBAC_PERMISSIONS_CSV_URL is not configured in environment')
		}

		const response = await fetch(csvUrl)

		if (!response.ok) {
			throw new BadRequestError(`Failed to fetch CSV: ${response.statusText}`)
		}

		const csvText = await response.text()
		const rows = await this.parseCsv(csvText)

		if (rows.length === 0) {
			throw new BadRequestError('CSV is empty or has no valid rows')
		}

		const uniqueRoleNames = [...new Set(rows.map((row) => row.role).filter(Boolean))]
		const uniqueResourceNames = [...new Set(rows.map((row) => row.resource).filter(Boolean))]

		// Clean up stale data
		await RolePermission.destroy({ where: {}, truncate: true })
		await Role.destroy({ where: { name: { [Op.notIn]: uniqueRoleNames } } })
		await Resource.destroy({ where: { name: { [Op.notIn]: uniqueResourceNames } } })

		// Upsert roles
		const roleMap: Record<string, string> = {}
		for (const roleName of uniqueRoleNames) {
			const [role] = await Role.upsert({ name: roleName }, { returning: true })
			roleMap[roleName] = role.id
		}

		// Upsert resources
		const resourceMap: Record<string, string> = {}
		for (const resourceName of uniqueResourceNames) {
			const [resource] = await Resource.upsert({ name: resourceName }, { returning: true })
			resourceMap[resourceName] = resource.id
		}

		// Create permissions
		let permissionsCreated = 0
		for (const row of rows) {
			const roleId = roleMap[row.role]
			const resourceId = resourceMap[row.resource]

			if (!roleId || !resourceId) continue

			await RolePermission.create({
				role_id: roleId,
				resource_id: resourceId,
				create: row.create,
				read: row.read,
				revise: row.revise,
				remove: row.remove,
				root: row.root,
			})
			permissionsCreated++
		}

		return {
			statusCode: 200,
			payload: {
				roles: uniqueRoleNames,
				resources: uniqueResourceNames,
				counts: {
					roles: uniqueRoleNames.length,
					resources: uniqueResourceNames.length,
					permissions: permissionsCreated,
				},
			},
			message: 'RBAC permissions synced successfully',
		}
	}

	async getAllRoles(): Promise<IServiceResponse> {
		const roles = await Role.findAll({
			include: [
				{
					model: RolePermission,
					include: [Resource],
				},
			],
		})

		return { statusCode: 200, payload: roles, message: 'Roles fetched successfully' }
	}

	async getRolePermissions(roleName: string): Promise<IServiceResponse> {
		const role = await Role.findOne({
			where: { name: roleName },
			include: [
				{
					model: RolePermission,
					include: [Resource],
				},
			],
		})

		if (!role) {
			throw new BadRequestError(`Role '${roleName}' not found`)
		}

		return { statusCode: 200, payload: role, message: 'Role permissions fetched successfully' }
	}

	private parseCsv(csvText: string): Promise<any[]> {
		const rows: any[] = []

		return new Promise((resolve, reject) => {
			Readable.from(csvText)
				.pipe(csvParser())
				.on('data', (row) => {
					rows.push({
						role: row.role?.trim(),
						resource: row.resource?.trim(),
						create: row.create === 'TRUE',
						read: row.read === 'TRUE',
						revise: row.revise === 'TRUE',
						remove: row.remove === 'TRUE',
						root: row.root === 'TRUE',
					})
				})
				.on('end', () => resolve(rows))
				.on('error', reject)
		})
	}
}

export default new RoleService()
