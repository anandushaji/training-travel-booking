export class AuthTravelerResponseDto {
  userId: string;
  email: string;
  role: string;

  constructor(data: { userId: string; email: string; role: string }) {
    this.userId = data.userId;
    this.email = data.email;
    this.role = data.role;
  }
}
