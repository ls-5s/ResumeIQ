import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { refreshToken as refreshTokenApi } from "../api/login";
import { useLoginStore } from "../store/Login";

type ApiEnvelope<T = unknown> = {
  code?: number;
  message?: string;
  data?: T;
};

function readMessageFromBody(data: unknown): string | undefined {
  if (data && typeof data === "object" && "message" in data) {
    const msg = (data as { message: unknown }).message;
    return typeof msg === "string" ? msg : undefined;
  }
  return undefined;
}

// 1. 基础配置（Vercel 环境使用 / 相对路径代理，或直接使用后端地址）
const getBaseURL = () => {
  // Vercel 部署环境
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // 本地开发环境
  return "http://localhost:3000";
};
const baseURL = getBaseURL();

// 2. 创建Axios实例
const request: AxiosInstance = axios.create({
    baseURL,
    timeout: 100000, // 10秒超时
    headers: { "Content-Type": "application/json" },
});

// 3. 请求拦截器：携带token
request.interceptors.request.use(
    (config) => {
        // 从 zustand store 取 token
        const token = useLoginStore.getState().token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (err: AxiosError) => Promise.reject(err)
);

// 4. 响应拦截器：统一处理错误和数据格式
request.interceptors.response.use(
    // 成功响应：只返回业务数据（适配常见的{code, message, data}结构）
    (res) => {
        // 无正文成功（如 DELETE 返回 204）：没有 { code, data }，不能按信封解析
        if (res.status === 204 || res.status === 205) {
            return undefined as unknown as AxiosResponse;
        }
        const body = res.data as ApiEnvelope;
        // 业务成功（code为0/200都算成功，可根据你的后端调整）
        if ([0, 200, 201].includes(body.code ?? -1)) {
            // 运行时返回解包后的 data；Axios 拦截器类型仍声明为 AxiosResponse
            return body.data as unknown as AxiosResponse;
        }
        // 业务失败：抛出错误（让业务层catch处理）
        return Promise.reject(new Error(body.message || "请求失败"));
    },
    // 失败响应：分类处理HTTP错误
    async (err: AxiosError) => {
        const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // 优先使用后端返回的错误信息
        const backendMessage =
            readMessageFromBody(err.response?.data) ?? err.message;
        let errorMsg = "网络异常，请稍后重试";

        // 401：token过期，尝试刷新token
        if (err.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            const { refreshToken, logout } = useLoginStore.getState();
            
            if (refreshToken) {
                try {
                    // 调用刷新token接口
                    const res = await refreshTokenApi(refreshToken);
                    // 更新 token
                    useLoginStore.getState().setTokens(res.token, res.refreshToken);
                    // 重新设置请求头
                    originalRequest.headers.Authorization = `Bearer ${res.token}`;
                    // 重新发起请求
                    return request(originalRequest);
                } catch {
                    // 刷新失败，清除登录状态
                    errorMsg = "登录已过期，请重新登录";
                    logout();
                    window.location.href = "/";
                }
            } else {
                // 没有 refreshToken，直接跳转登录页
                errorMsg = "登录已过期，请重新登录";
                logout();
                window.location.href = "/";
            }
        }
        // 403：权限不足
        else if (err.response?.status === 403) {
            errorMsg = backendMessage || "暂无权限访问该资源";
        }
        // 4xx：其他客户端错误
        else if (err.response && err.response.status >= 400 && err.response.status < 500) {
            errorMsg = backendMessage || "请求错误";
        }
        // 5xx：服务器错误
        else if (err.response && err.response.status >= 500) {
            errorMsg = backendMessage || "服务器内部错误，请稍后重试";
        }
        // 超时错误
        else if (err.code === "ECONNABORTED") {
            errorMsg = "请求超时，请检查网络";
        }
        // 网络错误
        else if (!err.response) {
            errorMsg = "网络异常，请检查网络连接";
        }

        console.error("请求错误：", errorMsg);
        return Promise.reject(new Error(errorMsg));
    }
);

export default request;