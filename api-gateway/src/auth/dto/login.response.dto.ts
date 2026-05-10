export interface LoginResponseUser {
  id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
  user!: LoginResponseUser;
}
