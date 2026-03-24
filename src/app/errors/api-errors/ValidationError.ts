class ValidationError extends Error {
	statusCode: number

	constructor(message: string = 'Validation failed') {
		super(message)
		this.name = 'ValidationError'
		this.statusCode = 422
		Object.setPrototypeOf(this, ValidationError.prototype)
	}
}

export default ValidationError
