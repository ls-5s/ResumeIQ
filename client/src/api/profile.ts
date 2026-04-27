import instance from "../utils/http";
import type { Profile, UpdateProfileData } from "../types/profile";

// 获取个人信息
export const getProfile = async (): Promise<Profile> => {
  return instance.get("/v1/profile");
};

// 更新个人信息
export const updateProfile = async (data: UpdateProfileData): Promise<Profile> => {
  return instance.put("/v1/profile", data);
};
