export interface ITokenPayload {
	userId: string
	roleId: string | null
}

export interface ITokenPair {
	accessToken: string
	refreshToken: string
}
