import instance from "../utils/http";

interface GithubUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  token: string;
  refreshToken: string;
}

// 获取 GitHub 授权 URL
export const getGithubAuthUrl = async (): Promise<{ url: string; state: string }> => {
  return instance.get("/v1/auth/github/authorize");
};

// GitHub 登录（后端处理 GitHub API 调用）
export const githubRegister = async (code: string): Promise<GithubUser> => {
  return instance.post("/v1/auth/github/register", { code });
};
