// 本地开发：先于 db 加载，将 server/.env 注入 process.env（Vercel 上无 .env 文件时不影响已有环境变量）
import "./loadEnv.js";
import express, { Application, Request, Response, NextFunction } from "express";
import { testConnection, ensureTables } from "./db/index.js";
import { getUploadsRoot } from "./utils/uploadPaths.js";

import loginRouter from "./routes/login.js";
import authRouter from "./routes/auth.js";
import githubRouter from "./routes/github.js";
import githubAuthRouter from "./routes/githubAuth.js";
import settingRouter from "./routes/setting.js";
import emailRouter from "./routes/emailTemplate.js";
import resumeRouter from "./routes/resume.js";
import dashboardRouter from "./routes/dashboard.js";
import templateRouter from "./routes/screeningTemplate.js";
import teamRouter from "./routes/team.js";

const app: Application = express();

// Middleware：CORS（须由 Vercel Express 单函数处理整站路由，否则会落到 CDN 无 CORS 头）
app.use((req, res, next) => {
  const rawOrigin = req.headers.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  const requestedHeaders = req.headers["access-control-request-headers"];
  res.setHeader(
    "Access-Control-Allow-Headers",
    typeof requestedHeaders === "string"
      ? requestedHeaders
      : "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// 根路径：部署域名常指向 API，浏览器/探活会访问 `/`，避免无意义 404
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "ai-resume-screening-api",
    docs: "接口前缀 /v1",
  });
});

// 静态文件服务 - 提供简历文件访问
app.use("/uploads", express.static(getUploadsRoot()));

// 去掉 /api 前缀（vercel.json rewrite 统一到 /api/index，再由 Express 处理路径）
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    req.url = req.url.replace(/^\/api/, "") || "/";
  }
  next();
});

// route
app.use("/v1/auth", authRouter);
app.use("/v1/auth", githubRouter);
app.use("/v1/auth", githubAuthRouter);
app.use("/v1", loginRouter);
app.use("/v1", settingRouter);
app.use("/v1", emailRouter);
app.use("/v1", resumeRouter);
app.use("/v1", dashboardRouter);
app.use("/v1", templateRouter);
app.use("/v1", teamRouter);

// Express 全局错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 1. 处理 JWT Token 验证失败（401 未授权）
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      code: 401,
      message: "Token验证失败，请重新登录",
    });
  }

  // 2. 兜底处理所有其他错误（500 服务器错误）
  res.status(500).json({
    code: 500,
    message: err.message || "服务器内部错误",
  });
});

// Vercel Serverless 导出
const vercelHandler = app;
export default vercelHandler;

// 本地开发启动（Vercel 环境不执行此代码）
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    console.log(`后端服务已启动: http://localhost:${PORT}`);
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log("数据库连接成功");
    } else {
      console.error("数据库连接失败");
    }
    // 自动建表（仅本地开发，生产由 drizzle-kit push 管理）
    await ensureTables();
  });
}
