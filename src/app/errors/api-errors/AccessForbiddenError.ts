class AccessForbiddenError extends Error {
	statusCode: number

	constructor(message: string = 'Access forbidden') {
		super(message)
		this.name = 'AccessForbiddenError'
		this.statusCode = 403
		Object.setPrototypeOf(this, AccessForbiddenError.prototype)
	}
}

export default AccessForbiddenError
