import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useLoginStore } from "../../store/Login";
import toast from "../../utils/toast";
import { githubRegister, getGithubAuthUrl } from "../../api/auth";

const MAX_RETRY_COUNT = 2;

export default function GithubCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useLoginStore();
  const retryCountRef = useRef(0);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      toast.error("授权失败：未收到授权码");
      window.location.href = "/";
      return;
    }

    const handleGithubCallback = async (code: string) => {
      try {
        const userData = await githubRegister(code);
        
        login({
          token: userData.token,
          refreshToken: userData.refreshToken,
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar,
        });
        
        toast.success("登录成功");
        window.location.href = "/app";
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        const errorMessage = err.response?.data?.message || err.message || "";
        
        if (
          (errorMessage.includes("incorrect or expired") || errorMessage.includes("expired")) &&
          retryCountRef.current < MAX_RETRY_COUNT
        ) {
          retryCountRef.current++;
          toast.warning(`授权码已过期，正在重新获取... (${retryCountRef.current}/${MAX_RETRY_COUNT})`);
          
          try {
            const { url } = await getGithubAuthUrl();
            setTimeout(() => {
              window.location.href = url;
            }, 1000);
          } catch {
            setTimeout(() => {
              window.location.href = "/auth/login";
            }, 1000);
          }
          return;
        }
        
        console.error('GitHub 登录失败:', error);
        toast.error(errorMessage || "GitHub 登录失败");
        window.location.href = "/auth/login";
      }
    };

    handleGithubCallback(code);
  }, [searchParams, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">正在处理 GitHub 登录...</p>
      </div>
    </div>
  );
}
