# AI 简历筛选系统 — 大厂面试完整技术解析

> 本文档基于 `D:\AI-resume-screening` 项目源码，面向大厂面试进行系统性深度解读。

---

## 一、项目整体定位

这是一个面向 **HR / 招聘团队** 的 SaaS 化工具，提供从**简历上传 → AI 自动评分筛选 → 批量发送面试邀请**的完整招聘工作流，核心价值在于用 LLM 替代 HR 手工阅读简历的低效环节。

**业务价值**：传统 HR 逐份读简历效率低，AI 可以先跑一遍初筛，把明显不合适的过滤掉，让 HR 只看高匹配度的简历。

---

## 二、技术栈全景图

### 2.1 前端技术栈

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|---------|------|---------|
| 框架 | React | 19.2.0 | 新版 React，支持 Concurrent Features |
| 构建 | Vite | 8.0.0-beta.13 | 极快的 HMR，服务端预构建依赖 |
| 语言 | TypeScript | 5.9.3 | 全链路类型安全 |
| 样式 | Tailwind CSS | 4.2.1 | 原子化 CSS，CSS 变量主题系统 |
| 状态 | Zustand | 5.0.11 | 极简 API，天然支持持久化 |
| HTTP | Axios | 1.13.6 | 拦截器生态成熟，统一错误处理 |
| 路由 | React Router | v7.13.1 | 数据路由 loader 机制，SSR 友好 |
| UI组件 | Radix UI + Lucide | - | Headless 组件库，完全样式可控 |
| 动画 | Framer Motion | 12.38.0 | 声明式动画 |
| 表单 | React Hook Form | 7.56.4 | 性能最优的表单管理 |
| 图表 | Recharts | 3.8.0 | React 原生 SVG 图表库 |
| 文档解析 | Mammoth.js | 1.11.0 | DOCX 客户端解析 |
| Markdown | react-markdown | - | AI 理由富文本渲染 |
| 部署 | Vercel | - | 前端预设，即插即用 |

### 2.2 后端技术栈

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|---------|------|---------|
| 框架 | Express | 4.21.0 | 稳定、插件丰富、Serverless 兼容 |
| 语言 | TypeScript | 5.7.0 | 同前端，全链路类型 |
| ORM | Drizzle ORM | 0.45.1 | 轻量、无代码生成、编译时类型推导 |
| 数据库 | SQLite (Turso/libsql) | - | Serverless 友好，零配置，边缘部署 |
| 认证 | JWT (jsonwebtoken) | 9.0.2 | 标准 Token 方案 |
| 密码 | bcryptjs | 2.4.3 | 加盐不可逆哈希 |
| 加密 | Node.js crypto | 内置 | AES-256-CBC |
| 文件上传 | Multer | 2.1.1 | Express 文件上传中间件 |
| PDF解析 | pdf-parse | - | 服务端纯 Node.js 实现，兼容 Serverless |
| DOCX解析 | Mammoth | 1.11.0 | 同前端库，统一技术栈 |
| 邮件发送 | Nodemailer | 8.0.1 | SMTP 协议实现 |
| 邮件接收 | imap | 0.8.19 | IMAP 协议拉取附件 |
| 邮件解析 | mailparser | 3.9.3 | 解析邮件原始数据 |
| 部署 | Vercel Functions | - | Node.js 运行时，弹性伸缩 |

---

## 三、数据库设计

### 3.1 数据表结构

#### users 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 用户ID，自增 |
| username | TEXT | 用户名 |
| email | TEXT UNIQUE | 登录邮箱 |
| password | TEXT | bcrypt 哈希后的密码 |
| avatar | TEXT | 头像 Base64 |
| created_at | TEXT | 创建时间（ISO 字符串） |
| updated_at | TEXT | 更新时间 |

#### resumes 简历表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 简历ID |
| user_id | INTEGER FK | 所属用户 |
| name | TEXT | 候选人姓名 |
| email | TEXT | 候选人邮箱 |
| phone | TEXT | 候选人电话 |
| resume_file | TEXT | 文件路径 |
| original_file_name | TEXT | 原始文件名 |
| file_type | TEXT | pdf / docx / doc |
| file_size | INTEGER | 文件大小（字节） |
| summary | TEXT | AI 评估结论 |
| parsed_content | TEXT | 解析后文本内容 |
| score | INTEGER | AI 综合评分 0-100 |
| dimension_scores | TEXT | 七维度 JSON 字符串 |
| status | TEXT | pending / passed / rejected |
| last_email_sent_at | TEXT | 最后发送邮件时间 |
| created_at | TEXT | 创建时间 |

#### email_configs 邮箱配置表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 配置ID |
| user_id | INTEGER FK | 所属用户 |
| email | TEXT | QQ 邮箱地址 |
| auth_code | TEXT | 16位授权码（AES 加密存储） |
| imap_host | TEXT | IMAP 服务器（默认 imap.qq.com） |
| imap_port | INTEGER | IMAP 端口（默认 993） |
| smtp_host | TEXT | SMTP 服务器（默认 smtp.qq.com） |
| smtp_port | INTEGER | SMTP 端口（默认 465） |
| is_default | INTEGER | 是否默认配置（0/1） |
| is_deleted | INTEGER | 软删除标记（0/1） |

#### email_templates 邮件模板表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 模板ID |
| user_id | INTEGER FK | 所属用户 |
| name | TEXT | 模板名称 |
| subject | TEXT | 邮件主题 |
| body | TEXT | 邮件正文，支持 `{{name}}` 变量 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### ai_configs AI配置表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 配置ID |
| user_id | INTEGER FK | 所属用户 |
| name | TEXT | 配置名称 |
| model | TEXT | AI 模型（如 gpt-4o、qwen-max） |
| api_url | TEXT | API 地址 |
| api_key | TEXT | API Key（AES 加密存储） |
| prompt | TEXT | 筛选提示词模板 |
| is_default | INTEGER | 是否默认（0/1） |

#### activities 活动日志表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 日志ID |
| user_id | INTEGER FK | 所属用户 |
| type | TEXT | upload / screening / pass / reject / interview |
| resume_id | INTEGER | 关联简历ID |
| resume_name | TEXT | 简历名称（冗余存储） |
| description | TEXT | 操作描述 |
| created_at | TEXT | 创建时间 |

#### screening_templates 筛选模板表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 模板ID |
| user_id | INTEGER FK | 所属用户 |
| name | TEXT | 模板名称 |
| config | TEXT | JSON 化的筛选条件配置 |
| is_default | INTEGER | 是否默认 |

### 3.2 索引设计

| 表名 | 索引字段 | 用途 |
|------|---------|------|
| resumes | user_id | 数据隔离查询 |
| resumes | email | 候选人邮箱查询 |
| resumes | created_at | 按时间排序 |
| email_configs | user_id | 用户配置查询 |
| email_templates | user_id | 用户模板查询 |
| ai_configs | user_id | 用户 AI 配置查询 |
| activities | user_id + created_at | 用户活动 + 时间排序 |

### 3.3 表关系

```
users (1) ────── (N) resumes
users (1) ────── (N) email_configs
users (1) ────── (N) email_templates
users (1) ────── (N) ai_configs
users (1) ────── (N) activities
users (1) ────── (N) screening_templates
```

---

## 四、功能模块详解

### 4.1 用户认证系统

#### 注册流程

1. 用户填写 `username` + `email` + `password`
2. 前端 `POST /v1/login/register` 发送请求
3. 后端 `registerUser` service：
   - 校验邮箱是否已存在（防止重复注册）
   - 用 **bcrypt** 哈希密码（加盐轮次 10）
   - 插入 `users` 表
   - 返回"注册成功"
4. 用户再手动登录

#### 登录流程（双 Token 机制）

1. 用户提交 `email` + `password`
2. 后端查询用户，比对 bcrypt 哈希
3. 生成 **Access Token**（有效期 7 天）：包含 `{id, email, username}`
4. 生成 **Refresh Token**（有效期 30 天）：同样 payload
5. 返回给前端，前端存入 Zustand + localStorage

#### Token 自动刷新（Axios 拦截器）

```
401 发生时，拦截器自动：
1. 检查是否有 _retry 标记（防止无限重试循环）
2. 用 refreshToken 调用 POST /v1/login/refresh
3. 刷新成功 → 用新 token 重试原请求（原地重发）
4. 刷新失败 → 清除登录态，跳转登录页
```

#### 路由守卫

使用 React Router v7 的 `loader` 机制，在路由层面做鉴权：

```ts
const requireAuth = () => {
  const token = useLoginStore.getState().token;
  if (!token) throw redirect("/?redirect=unauthorized");
  return null;
};
// /app 下的所有子路由都要先经过这个 loader，没登录直接重定向
```

### 4.2 简历管理

#### 上传流程

```
用户选择文件 → Multer 拦截 → 写入 uploads/ 目录
→ 解析 PDF/DOCX 文本 → 正则提取联系方式
→ 插入 resumes 表 → 记录 activity 日志
```

#### 文件解析（两种格式）

**PDF 解析**：`pdf-parse` 库读取 PDF 原始数据，提取 `text` 属性。

**局限性**：只能提取文本，无法处理图片扫描件（OCR 需要额外集成 Tesseract）。

**DOCX 解析**：`mammoth.extractRawText` 直接提取 Word 文档的纯文本内容。

#### 联系信息提取

从解析后的纯文本用正则表达式提取：
- **邮箱**：`/[\w.-]+@[\w.-]+\.\w+/`
- **电话**：`/1[3-9]\d{9}/`（中国大陆手机号）
- **姓名**：从文件名中提取（去掉后缀），或取邮件主题

#### 简历列表查询（动态多条件过滤）

```ts
// 支持的过滤条件：
keywords:      关键词（AND / OR 模式）模糊匹配 parsedContent
minScore:      最低分  →  gte(score, N)
dateFrom/To:   日期范围 → createdAt BETWEEN
status:        pending / passed / rejected

// Drizzle 查询构建器组合
const whereClause = and(
  eq(resumes.userId, userId),      // 数据隔离
  keywordCondition,                  // 动态关键词
  minScoreCond,                      // 分数过滤
  dateFromCond, dateToCond,         // 日期范围
  statusCond                         // 状态过滤
);
```

#### 删除简历（安全防护）

```ts
// 1. 先查数据库，确认简历属于当前用户（防止越权删除）
// 2. 删除磁盘文件前，检查路径是否在 uploads 目录内
const resolvedFile = path.resolve(resume.resumeFile);
if (!resolvedFile.startsWith(getUploadsRoot())) {
  return; // 路径穿越攻击防护
}
// 3. 物理删除文件和数据库记录
```

#### 批量状态更新

用户选中多份简历，一键改为"通过/拒绝/待筛选"：
- 校验所有 ID 属于当前用户
- 用 `inArray` 批量 UPDATE
- 每条记录都生成一条 activity 日志

### 4.3 AI 智能筛选（核心模块）

#### 工作流程

```
输入岗位要求 → 组装 Prompt（占位符替换） → 调用 LLM API
→ 解析 Markdown/JSON 响应 → 提取评分+理由
→ 更新简历记录 → 记录活动日志
```

#### Prompt 工程设计

```ts
const prompt = `
你是招聘筛选助手。请严格依据「岗位要求」和「筛选标准」评估候选人。

岗位要求：
${jobRequirements}

筛选标准（用户自定义 prompt）：
${userPrompt}

候选人简历内容：
${parsedContent}

// 输出格式要求（Few-shot 引导）
推荐：pass|reject|pending
综合分：XX（0-100 整数）
维度评分：
- 专业技能：XX
- 项目经验：XX
- 工作经历：XX
- 教育背景：XX
- 岗位匹配：XX
- 沟通协作：XX
- 在校经历：XX

## 评估理由
[详细说明...]
`;
```

#### 三种 API 格式适配

```ts
// 1. OpenAI 标准格式
{ model, messages, max_tokens }

// 2. 阿里云兼容模式（/compatible-mode/）
{ model, messages, max_tokens }  // 同 OpenAI

// 3. 阿里云原生 API（dashscope.aliyuncs.com）
{ model, task, input: { messages }, parameters: { result_format: "message" } }

// 通过 URL 检测 API 类型
function detectApiType(url: string) {
  if (url.includes("dashscope.aliyuncs.com")) {
    if (url.includes("/compatible-mode/")) return "aliyun-compatible";
    return "aliyun-native";
  }
  return "other";
}
```

#### AI 响应三级解析

```ts
// 第一级：Markdown 结构化解析（正则）
const recMatch = raw.match(/推荐[：:]\s*(pass|reject|pending)/i);
const scoreMatch = raw.match(/综合[分评分][：:]\s*(\d+)/);
// 维度评分：逐项正则匹配 "专业技能：XX" 等

// 第二级：兜底 JSON 解析
const jsonMatch = raw.match(/\{[\s\S]*\}/);
JSON.parse(jsonMatch[0]);

// 第三级：关键词兜底
if (contains("推荐"/"通过")) → pass
if (contains("拒绝"/"不合适")) → reject
```

#### 七维度评分模型

| 维度 | 含义 |
|------|------|
| 专业技能 | 技术栈与岗位的匹配程度 |
| 项目经验 | 项目深度和相关度 |
| 工作经历 | 履历连续性和层级 |
| 教育背景 | 学历与专业对口程度 |
| 岗位匹配 | 整体与岗位的匹配程度 |
| 沟通协作 | 表达和协作能力 |
| 在校经历 | 校园活动/实习经验 |

这种多维度评分比单一总分更有参考价值——比如某候选人总分低但项目经验分很高，HR 可以直观看到原因。

#### 雷达图可视化（Recharts）

用 **Recharts** 的 `RadarChart` + `PolarGrid` 实现七维雷达图：
- 有模型评分 → 用实际分项数据
- 无分项数据 → 用综合分生成**参考分布**（按比例填充，提示用户需要重新跑 AI）
- SVG 圆环进度环显示综合分（0-100 整百分数）

#### 批量筛选

顺序遍历简历数组，逐个调用 `screenResumeWithAi`，每个成功/失败都记录结果，最后返回汇总。前端显示进度（当前第几个/总共几个）。

### 4.4 邮件管理

#### 邮箱配置

用户配置 SMTP/IMAP 参数（支持 QQ 邮箱）：
- **SMTP**：发邮件（端口 465 SSL / 587 STARTTLS）
- **IMAP**：收邮件拉取附件（端口 993）
- **授权码**：AES-256-CBC 加密存储

#### 邮件模板系统

用户创建模板，正文支持变量替换：
```
{{name}}  → 候选人姓名
{{email}} → 候选人邮箱
{{job}}   → 岗位名称（预留）
```
前端用 `body.replace(/\{\{(\w+)\}\}/g, ...)` 实现替换。

#### 批量发送

1. 筛选出 `status = passed` 的简历
2. 读取邮件模板和发件邮箱配置
3. 连接 SMTP 服务器
4. 逐个替换模板变量并发送
5. 发送失败不阻塞其他（容错设计）

#### 发送统计

记录三个维度：`totalSent`（累计）、`todaySent`（今日）、`monthSent`（本月），按月重新统计避免数据膨胀。

### 4.5 仪表盘

#### 统计数据

```ts
// 一次查询获取所有统计
const [total, passed, rejected, pending] = await Promise.all([
  db.select().from(resumes).where(eq(resumes.userId, userId)),
  db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.status, "passed"))),
  db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.status, "rejected"))),
  db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.status, "pending"))),
]);
```

#### 周趋势柱状图

按最近 7 天聚合简历数量，用 GROUP BY `date(createdAt)` 统计每天新增数，Recharts `BarChart` 展示。

#### 活动日志

记录所有关键操作类型：

| 类型 | 含义 |
|------|------|
| upload | 上传简历 |
| screening | AI 筛选 |
| pass | 手动通过 |
| reject | 手动拒绝 |
| interview | 发送面试邀请 |

### 4.6 筛选模板管理

用户可以保存一套筛选条件（关键词、分数阈值、日期范围）为一个**模板**，下次直接选用，不必每次手动输入：
- 保存：`POST /v1/templates`，存 `config: JSON.stringify(preFilterConfig)`
- 加载：从 `localStorage` 读取上次选中的模板 ID，自动应用
- 支持设为默认模板

### 4.7 邮箱导入简历（IMAP）

通过 IMAP 协议连接 QQ 邮箱（`imap.qq.com:993`），搜索含简历附件的邮件，自动下载并解析。

**重要细节**：候选人邮箱从简历正文解析，不从邮件发件人取，因为发件人往往是 HR 或猎头，不是候选人本人。

---

## 五、前端架构设计

### 5.1 状态管理（Zustand）

```ts
// 两个 Store
LoginStore  → token / refreshToken / user / isLoggedIn
ThemeStore  → theme: "light" | "dark" | "system"

// persist 中间件 → localStorage 自动持久化
// 刷新页面不丢登录态
```

### 5.2 Axios 封装（统一拦截器）

```
请求拦截器：所有请求自动加 Authorization header
响应拦截器：
  ├─ 2xx → 解包 { code, data }，返回 data
  ├─ 401 → 自动刷新 token → 重试原请求
  ├─ 403 → "暂无权限"
  ├─ 4xx → 显示后端错误信息
  ├─ 5xx → "服务器错误"
  └─ 超时 → "请求超时"
```

### 5.3 代码分割（懒加载）

```tsx
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
// 所有页面组件都懒加载，首屏只加载 Login
// Suspense + PageLoader 提供加载态
```

### 5.4 Tailwind CSS 4 主题系统

所有颜色通过 CSS 变量引用：

```css
/* 定义层 */
:root {
  --app-bg: #ffffff;
  --app-text-primary: #1e293b;
  --app-primary: #3b82f6;
}

/* 使用层 */
<div className="bg-(--app-bg) text-(--app-text-primary)">
  <button className="bg-(--app-primary)">Button</button>
</div>
```

切换主题只需 JS 修改 `:root` 的 CSS 变量值，**无需重新构建**，一行代码换肤。

### 5.5 骨架屏加载态

每个 Dashboard 区块都有独立的 Skeleton 组件：

| 组件 | 用途 |
|------|------|
| SkeletonStrip | 四个统计格子的骨架 |
| SkeletonChart | 柱状图占位 |
| SkeletonActivity | 活动列表占位 |
| SkeletonQuick | 快捷入口占位 |

用 Tailwind 的 `animate-pulse` 模拟加载动画，用户体验比 loading spinner 好很多。

### 5.6 AI 筛选工作台（核心 UI）

采用 **12 栅格 4+8 布局**：
- 左侧 4 列：候选人列表 + 筛选条件 + 状态 Tab + 分页
- 右侧 8 列：候选人详情 Drawer
  - 顶部：姓名 + 状态标签 + 操作按钮
  - 中部：雷达图 + 圆环进度分
  - 底部：折叠的 AI 评估理由

---

## 六、后端架构设计

### 6.1 服务入口

```ts
// Express 单函数处理整站路由（适配 Vercel Serverless）
const app: Application = express();

// CORS 中间件（动态 Origin，支持凭证）
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use("/uploads", express.static(getUploadsRoot())); // 静态文件

// 路由注册
app.use("/v1", loginRouter);    // 登录注册
app.use("/v1", settingRouter); // 设置/AI配置/邮箱配置
app.use("/v1", emailRouter);   // 邮件模板
app.use("/v1", resumeRouter);   // 简历 CRUD
app.use("/v1", dashboardRouter);// 仪表盘统计
app.use("/v1", templateRouter); // 筛选模板

// 全局错误处理（JWT 验证失败在这里捕获）
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ code: 401, message: "Token验证失败" });
  }
  res.status(500).json({ code: 500, message: err.message });
});
```

### 6.2 数据库连接（Turso/libsql）

```ts
// 环境变量来源（优先级）：
// 1. Vercel Dashboard 环境变量（生产）
// 2. process.env（本地 .env 注入）
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url: tursoUrl, authToken: tursoToken });
export const db = drizzle(client, { schema });
```

### 6.3 Drizzle ORM 表关系

```ts
// 一对多关系通过 relations() 定义
export const usersRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
  aiConfigs: many(aiConfigs),
  emailConfigs: many(emailConfigs),
  emailTemplates: many(emailTemplates),
  activities: many(activities),
}));

// 一对一关系
export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
}));
```

### 6.4 敏感信息加密（AES-256-CBC）

```ts
// 密钥来源：process.env.ENCRYPTION_KEY
// 格式：支持 64 位 hex（32 字节）或原始字符串（补零截断）

// 加密流程：
iv = crypto.randomBytes(16)          // 每次独立随机 IV
cipher = createCipheriv("aes-256-cbc", key, iv)
ciphertext = cipher.update(plaintext) + cipher.final()
return Base64(iv + ciphertext)      // IV 拼接在密文前

// 解密时：
data = Base64.decode(ciphertext)
iv = data[0:16]                      // 提取 IV
ciphertext_body = data[16:]           // 提取密文
decipher = createDecipheriv("aes-256-cbc", key, iv)
return decipher.update(ciphertext_body) + decipher.final()
```

---

## 七、安全设计体系

| 安全措施 | 实现细节 |
|---------|---------|
| JWT Bearer Token | 每次请求 Authorization header 携带 |
| 密码 bcrypt 哈希 | 加盐轮次 10，不可逆 |
| API Key AES 加密 | 独立随机 IV，Base64 存储 |
| 邮箱授权码加密 | 同 AES 方案 |
| 脱敏返回 | 前端永远拿不到 apiKey（返回 ""） |
| SQL 注入防护 | Drizzle 参数化查询，100% 安全 |
| 路径穿越防护 | 删除文件前校验路径前缀 |
| CORS 动态 Origin | 根据请求 Origin 动态设置 |
| 数据隔离 | 所有查询强制加 `userId` 条件 |
| 错误信息统一 | 登录失败不区分"用户不存在"或"密码错误"（防枚举攻击） |

---

## 八、工程化实践

| 实践 | 说明 |
|------|------|
| 前后端全量 TypeScript | 类型安全从数据库到 UI |
| 环境变量分层 | 本地 `.env` / Vercel Dashboard |
| 懒加载路由 | 首屏加载只含 Login，其他按需加载 |
| Skeleton 骨架屏 | 避免 loading spinner 的冷体验 |
| Axios 统一封装 | 错误处理和 token 刷新对业务透明 |
| 软删除 | `is_deleted` 标记，保留审计数据 |
| 活动日志冗余设计 | `resumeName` 冗余存储，简历删了日志仍可读 |
| 主题切换 | CSS 变量 + Zustand，一行 JS 换肤 |
| 响应式布局 | Tailwind `md:` / `lg:` 断点适配移动端 |
| 多 API 适配层 | OpenAI / 阿里云兼容模式 / 阿里云原生 |

---

## 九、技术亮点面试加分话术

### Q1: 为什么选 Drizzle ORM 而不是 Prisma？

> Drizzle 是"类型安全 + 零代码生成"的 ORM。Prisma 用代码生成器每次 schema 改都要重新生成，CI 流程复杂，生成的代码量大。Drizzle 的 schema 直接 ts 文件定义，编译时类型推导，生成 SQL 接近原生，性能更高，而且支持 SQLite/MySQL/PG 多数据库无缝切换。

### Q2: JWT Access Token 和 Refresh Token 的区别和为什么这样设计？

> Access Token 有效期短（7天），万一泄露窗口期小。Refresh Token 有效期长（30天）但只用于刷新，不参与业务请求。即使 Access Token 被抓包，攻击者只有 7 天可用；Refresh Token 存后端，服务端可以随时 invalidate。这个设计比单 Token 更安全，代价是多一次刷新请求。

### Q3: 为什么 AI 响应要用三级解析兜底？

> LLM 输出格式不稳定，OpenAI 和通义的输出格式也各有差异。一级 Markdown 正则是精确提取；二级 JSON 兜底处理模型误输出了 JSON 格式；三级关键词兜底处理模型完全"放飞自我"的情况。每级都配合 NaN 检查和 0-100 clamp，防止脏数据入库。

### Q4: AES-256-CBC 每条记录用独立 IV 有什么用？

> 防止**选择明文攻击**。如果所有加密都用同一个 IV，攻击者看到两份相同明文的密文相同，就能推断出明文内容。独立 IV 让相同明文每次加密结果都不同，即使知道明文是"张三的简历"，也找不到密文规律。

### Q5: 怎么理解 CSS 变量做主题系统？

> 传统主题切换需要多套 CSS 文件或构建多个 bundle。CSS 变量方案在 `:root` 定义变量，换肤只改变量值，所有引用了变量的元素自动更新，不需要重新构建，不需要 JS 切换 class，**性能最优**。

### Q6: Serverless 下文件上传有什么局限？

> Vercel Functions 请求体限制 4.5MB（早期 100KB），大文件上传不适合直接走 Serverless。更好的方案是：**前端直传对象存储**（AWS S3 / 阿里云 OSS），Serverless 只处理 metadata 和后续的解析/AI 逻辑。

### Q7: 活动日志为什么冗余存 `resumeName`？

> 这是**反规范化**实践。简历删了以后，`resume_id` 就找不到对应记录了，但 HR 仍然想知道"谁被删了"。冗余存储姓名，保证活动日志的**可读性不依赖**被关联表的存在。这是有意为之的数据冗余，换来的是日志查询的简单和可靠。

### Q8: Zustand 相比 Redux 有什么优势？

> 代码量少 80%——没有 Provider 嵌套、没有 Action/Reducer 模板代码、没有 RTK 的复杂配置。`persist` 中间件直接对接 localStorage，两行代码搞定登录态持久化。TypeScript 类型推导天然好。Redux 的优点是生态丰富（DevTools 中间件），但这个项目里用到的功能 Zustand 全都有。

### Q9: React Router v7 的 loader 和 useEffect 比有什么好处？

> loader 在路由层面做数据加载，比组件内 useEffect 更早执行，数据没准备好时不渲染组件，**避免闪现无数据的状态**。而且 loader 可以做**重定向**（throw redirect），在路由层面就拦截，比 useEffect + navigate 更干净。loader 返回的数据通过 `useRouteLoaderData` 获取，类型安全。

### Q10: React 19 和之前版本有什么关键区别？

> React 19 有 **Concurrent Features** 改进，更好的 `useTransition` 支持，**Server Components** 原生支持（SSR/SSG 更简单），改进的 **Ref 作为 props**，以及 `use()` hook 支持在渲染层读取 Promise 和 Context。这个项目用 React 19 可以更好地配合 React Router v7 的数据加载机制。

### Q11: 为什么多维度评分比单一总分更好？

> 单一总分隐藏了决策过程。HR 看到一个人总分 60 分不知道为什么，可能是教育背景差但技术很强。如果有七维度雷达图，HR 一眼就能看到"这人人技术没问题，就是学历一般，要不要降格录用"。多维度让 AI 的评估变得**可解释**，而不是黑盒评分。

---

## 十、API 路由汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/login | 用户登录 |
| POST | /v1/register | 用户注册 |
| POST | /v1/refresh | 刷新 Token |
| GET | /v1/profile | 获取个人信息 |
| PUT | /v1/profile | 更新个人信息 |
| GET | /v1/resumes | 获取简历列表（支持多条件过滤） |
| POST | /v1/resume/upload | 上传简历文件 |
| GET | /v1/resume/:id | 获取简历详情 |
| DELETE | /v1/resume/:id | 删除简历 |
| PUT | /v1/resume/:id/status | 更新简历状态 |
| POST | /v1/resume/batch-status | 批量更新状态 |
| POST | /v1/resume/import-from-email | 从邮箱导入简历 |
| GET | /v1/settings/emails | 获取邮箱配置列表 |
| POST | /v1/settings/emails | 创建邮箱配置 |
| PUT | /v1/settings/emails/:id | 更新邮箱配置 |
| DELETE | /v1/settings/emails/:id | 删除邮箱配置 |
| POST | /v1/settings/emails/:id/test | 测试邮箱连接 |
| GET | /v1/settings/ai/list | 获取 AI 配置列表 |
| GET | /v1/settings/ai | 获取默认 AI 配置 |
| POST | /v1/settings/ai | 创建 AI 配置 |
| PUT | /v1/settings/ai/:id | 更新 AI 配置 |
| DELETE | /v1/settings/ai/:id | 删除 AI 配置 |
| POST | /v1/settings/ai/test | 测试 AI 连接 |
| POST | /v1/settings/ai/screen | AI 筛选单个简历 |
| POST | /v1/settings/ai/batch-screen | AI 批量筛选 |
| GET | /v1/dashboard/stats | 获取仪表盘统计 |
| GET | /v1/activities | 获取活动日志 |
| GET | /v1/email-templates | 获取邮件模板列表 |
| POST | /v1/email-templates | 创建邮件模板 |
| PUT | /v1/email-templates/:id | 更新邮件模板 |
| DELETE | /v1/email-templates/:id | 删除邮件模板 |
| POST | /v1/emails/send | 批量发送邮件 |
| GET | /v1/screening-templates | 获取筛选模板列表 |
| POST | /v1/screening-templates | 创建筛选模板 |
| PUT | /v1/screening-templates/:id | 更新筛选模板 |
| DELETE | /v1/screening-templates/:id | 删除筛选模板 |
