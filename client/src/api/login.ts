import instance from "../utils/http";
import type { UserInfo, LoginData, RegisterData, RefreshTokenResponse } from "../types/login";

export const login = async (data: LoginData): Promise<UserInfo> => {
  return instance.post("/v1/login", data);
};

export const register = async (data: RegisterData): Promise<UserInfo> => {
  return instance.post("/v1/register", data);
};

export const refreshToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  return instance.post("/v1/refresh", { refreshToken });
};
