export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  token: string;
  refreshToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}
