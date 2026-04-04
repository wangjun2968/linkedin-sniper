# LinkedIn Profile Optimizer MVP 🦞

## 1. 后端部署 (Cloudflare Worker)
1. 进入 `linkedin-optimizer/backend`。
2. 登录 Cloudflare: `npx wrangler login`。
3. 创建 Worker: `npx wrangler deploy src/index.ts --name linkedin-api`。
4. **环境变量**：在 Cloudflare 控制台 -> Workers -> `linkedin-api` -> Settings -> Variables 中添加 `OPENAI_API_KEY`。
5. **记录 URL**：获取生成的 `.workers.dev` 域名。

## 2. 前端部署 (Cloudflare Pages)
1. 修改 `frontend/src/App.tsx` 中的 `https://YOUR-WORKER-SUBDOMAIN.workers.dev` 为你的实际后端 URL。
2. 将 `frontend` 推送到 GitHub。
3. 在 Cloudflare 控制台 -> Workers & Pages -> Create Pages -> Connect to Git。
4. Build settings:
   - Framework preset: `Vite` (或 `Create React App`)
   - Build command: `npm run build`
   - Build output directory: `dist` (或 `build`)

## 3. 运行逻辑
- 用户在页面粘贴 LinkedIn 档案文本。
- 按钮触发 POST 到 Cloudflare Worker。
- OpenAI gpt-4o-mini 处理并返回结构化 JSON。
- 前端渲染深蓝风格的优化建议。
