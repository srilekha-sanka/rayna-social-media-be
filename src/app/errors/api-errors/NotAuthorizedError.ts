class NotAuthorizedError extends Error {
	statusCode: number

	constructor(message: string = 'Not authorized') {
		super(message)
		this.name = 'NotAuthorizedError'
		this.statusCode = 401
		Object.setPrototypeOf(this, NotAuthorizedError.prototype)
	}
}

export default NotAuthorizedError
