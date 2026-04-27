import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // recharts 体积大、依赖多，显式预构建可避免「Outdated Optimize Dep」导致 504
  optimizeDeps: {
    include: ['recharts'],
  },
  // 与 Vercel「Root Directory = client」一致：站点根即 dist，资源在 /assets，勿用 /client/ 前缀
  base: '/',
  server: {
    proxy: {
      // API 代理
      '/v1': {
        target: process.env.VERCEL ? 'https://' + process.env.VERCEL_BRANCH_URL : 'http://localhost:3000',
        changeOrigin: true,
      },
      // GitHub API 代理（解决中国大陆无法直接访问 GitHub 的问题）
      '/github-api': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ''),
        secure: true,
      },
    },
  },
})
