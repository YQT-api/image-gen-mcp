# 上架到 MCP Hub 指南

本目录已准备好上架到公开 MCP 注册中心所需的全部元数据文件。按以下顺序提交，约 1 小时内可出现在多个平台。

## 前置条件（已完成 ✅）

- ✅ 已发布到 npm：`@aaa147258qq/image-gen-mcp@1.0.0`（npx 可直接拉取）
- ✅ 代码已确认**不含任何硬编码 Key**（Key 仅通过 `IMAGE_API_KEY` 环境变量注入）
- ✅ 已有 `.gitignore` 屏蔽 `.env` / `node_modules`，杜绝误提交密钥

## 准备工作：推到 GitHub（必须）

所有公开 Hub 都从 GitHub 仓库自动发现或手动关联，所以第一步是建仓库并推送：

```bash
# 在 GitHub 网页新建仓库 image-gen-mcp（公开），然后本地：
cd image-gen-mcp
git remote add origin https://github.com/aaa147258qq/image-gen-mcp.git
git branch -M main
git push -u origin main
```

推送后，仓库里应有：`src/`、`dist/`、`bin/`、`package.json`、`README.md`、`smithery.yaml`、`glama.json`、`server.json`、`.gitignore`。

---

## 平台一：Smithery（推荐，最火，支持一键安装）

**方式 A — 网页（最简单）**
1. 登录 https://smithery.ai → **Publish MCP**
2. 选 "From GitHub repository"，填 `aaa147258qq/image-gen-mcp`
3. 填表：
   - Name：`image-gen-mcp`
   - Description：`基于 shiwuyan 图片接口封装的 MCP 服务，提供文生图与图生图工具，通过 npx 一键启动`
   - Required env：`IMAGE_API_KEY`
   - Example prompts：`帮我生成一张赛博朋克风格的城市夜景`
4. 提交后默认 unlisted，去页面点 **Change visibility → Public** 才公开

**方式 B — CLI**
```bash
npx @smithery/cli publish --name @aaa147258qq/image-gen-mcp --transport stdio
```
> 仓库根目录的 `smithery.yaml` 已声明 stdio 启动方式与所需环境变量，Smithery 会自动读取。

---

## 平台二：Glama（量大，靠 glama.json 认领所有权）

1. 确保仓库根目录有 `glama.json`（已备好）
2. 打开 https://glama.ai/mcp/servers 搜索 `image-gen-mcp`
3. 找到后点 **Claim**（认领所有权，证明你是作者）
4. 填写介绍、示例 prompt，提升在目录中的排名

---

## 平台三：官方 MCP Registry（权威，被各客户端自动发现）

**方式 A — mcp-publisher CLI**
```bash
brew install mcp-publisher        # 或 npm i -g mcp-publisher
mcp-publisher init                # 会读取本目录 server.json 草稿
mcp-publisher login github        # 用 GitHub 登录，证明 io.github.aaa147258qq 命名空间归属
mcp-publisher publish
```

**方式 B — GitHub PR**
向 https://github.com/modelcontextprotocol/registry 的 `servers/` 目录提交一个 JSON（即本目录 `server.json`），等待合并。

---

## 平台四：MCPFind（纯发现，分类浏览）

打开 https://mcpfind.org → Submit → 填仓库地址 `aaa147258qq/image-gen-mcp` 与简介即可。

---

## 安全重申

- **你的 Key 不会上架**：上架只提交代码、README 与元数据；`IMAGE_API_KEY` 仅在用户本机的 MCP 客户端配置里填写，各平台只声明"本服务需要这个环境变量"，不存储也不传输你的密钥值。
- 若以后要本地调试，切记不要把含真 Key 的 `.env` 或 `~/.workbuddy/mcp.json` 复制进本目录再提交（`.gitignore` 已兜底拦截）。
- 用户各填各的 Key，互不影响。
