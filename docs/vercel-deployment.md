# Vercel 部署指南

本项目支持前后端分离部署到 Vercel，使用 Monorepo 方式管理。

## 快速部署（推荐）

### 方式一：使用 Vercel Dashboard（推荐：前后端各建一个项目）

根目录**不要**在 `vercel.json` 里写 `workspaces`——当前 Vercel 会校验失败（`should NOT have additional property workspaces`）。

1. 在 Vercel Dashboard 点击 **New Project**，导入**同一 Git 仓库**两次（或分别创建两个项目）。
2. **前端项目**：在 **Project Settings → General → Root Directory** 设为 `client`，Framework Preset 选 **Vite**，再 Deploy。
3. **后端项目**：Root Directory 设为 `server`（会使用 `server/vercel.json`），配置环境变量后再 Deploy。
4. 在前端环境变量里把 API 地址设为后端项目的生产 URL（例如 `VITE_SERVER_URL`）。

### 方式二：使用 GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 在 Vercel Dashboard 导入仓库
3. 配置环境变量（见下文）
4. 点击 Deploy

---

## 环境变量配置

部署前需要在 Vercel Project Settings 中配置以下环境变量：

### 后端环境变量（Storage > Postgres > .env.local）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | Postgres 连接字符串 | `postgres://xxx:xxx@host:5432/db` |
| `JWT_SECRET` | JWT 密钥 | `your-secret-key` |
| `ENCRYPTION_KEY` | 加密密钥 | 32字节十六进制字符串 |

### 前端环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_SERVER_URL` | 后端API地址 | `https://your-project.vercel.app` |

---

## Vercel Postgres 配置步骤

### 1. 创建 Postgres 数据库

1. 进入 Vercel Dashboard，选择你的项目
2. 点击左侧 **Storage** 标签
3. 点击 **Create Database** → 选择 **Postgres**
4. 选择区域（建议与部署区域一致）
5. 输入数据库名称，如 `resume-screening-db`
6. 点击 **Create**

### 2. 获取连接字符串

创建完成后，点击刚创建的 Postgres 数据库：

1. 选择 **.env.local** 标签页
2. 点击 **Show Secret** 查看完整连接字符串
3. 复制 `POSTGRES_URL` 等变量

### 3. 本地开发连接 Vercel Postgres

在项目根目录安装 Vercel CLI 并链接项目：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 链接项目
cd server
vercel link

# 下载环境变量到本地
vercel env pull .env.local

# 安装依赖
pnpm install

# 运行迁移
pnpm db:push
```

### 4. 将连接信息添加到后端

Vercel Postgres 会自动注入以下环境变量到 Serverless Functions：

| 变量名 | 说明 |
|--------|------|
| `POSTGRES_URL` | 完整连接字符串 |
| `POSTGRES_USER` | 数据库用户 |
| `POSTGRES_HOST` | 数据库主机 |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `POSTGRES_DATABASE` | 数据库名称 |

**注意**：Vercel Serverless Functions 无需手动配置这些变量，会自动注入。

### 5. 修改后端代码适配 Postgres

当前项目使用 MySQL，需要修改为适配 Postgres。以下是关键修改点：

#### 安装 Postgres 驱动

```bash
cd server
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit @types/pg
```

#### 修改数据库连接配置

```typescript
// src/db/index.ts - 改为使用 Postgres
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// 生产环境使用连接池
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
```

#### 修改环境变量

将 `vercel.json` 中的环境变量名改为：

| 旧名称（MySQL） | 新名称（Postgres） |
|-----------------|-------------------|
| `DB_HOST` | `POSTGRES_HOST` |
| `DB_PORT` | `POSTGRES_URL` (完整字符串) |
| `DB_USER` | `POSTGRES_USER` |
| `DB_PASSWORD` | `POSTGRES_PASSWORD` |
| `DB_NAME` | `POSTGRES_DATABASE` |

---

## 数据库迁移

### 使用 Drizzle Studio（推荐）

```bash
cd server

# 启动可视化迁移工具
pnpm db:studio
```

### 命令行迁移

```bash
# 生成迁移文件
pnpm db:generate

# 推送到数据库
pnpm db:push
```

---

## CLI 部署

在对应子目录链接并部署（不要用根目录带无效 `workspaces` 的配置）：

```bash
# 登录 Vercel
vercel login

# 前端
cd client && vercel link && vercel --prod

# 后端
cd server && vercel link && vercel --prod
```

---

## 注意事项

### 冷启动
Vercel Serverless Functions 有冷启动延迟，首次请求可能较慢。

### 超时限制
Vercel 免费版函数超时限制为 10 秒，专业版为 60 秒。AI 筛选简历等长时间操作可能需要：
- 使用异步处理
- 升级到专业版
- 考虑使用 Queue 等后台任务

### 地区选择
建议后端部署区域与数据库区域一致，减少延迟。

### 文件上传
当前实现使用本地文件系统存储上传文件。Vercel Serverless 无法持久化本地文件，建议：
- 使用云存储（阿里云OSS、AWS S3等）
- 或使用 Vercel Blob Storage

如需修改，请修改 `server/src/services/resume/fetcher.ts` 中的上传逻辑。

---

## 常见问题

### Q: Vercel Postgres 与本地开发如何连接？
A: 使用 `vercel env pull .env.local` 将环境变量下载到本地。

### Q: 如何查看数据库数据？
A: 在 Vercel Dashboard 的 Storage → Postgres → 数据浏览 中查看。

### Q: 数据库连接超时怎么办？
A: 检查是否在同一区域部署，尝试增加连接超时时间。
