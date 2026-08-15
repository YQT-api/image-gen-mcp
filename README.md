# image-gen-mcp

把 `aiapi.shiwuyan.cn` 的图片生成接口封装成 **MCP 服务**，让 WorkBuddy、Claude Desktop、
Cursor 等任意 MCP 客户端都能直接「生成图片」。

> 已用测试 Key 端到端验证：文生图正常出图；上游（官方接口）失败时统一向用户返回「官方接口繁忙，生成失败」。

---

## 一、接口契约（已实测）

| 能力 | 端点 | 说明 |
| --- | --- | --- |
| 模型列表 | `GET /v1/models` | 返回可用模型 ID |
| 文生图 | `POST /v1/images/generations` | JSON，返回 `b64_json` |
| 图生图/编辑 | `POST /v1/images/edits` | `multipart/form-data`，需上传参考图 |

鉴权统一为 `Authorization: Bearer <API_KEY>`，**Base URL** 为 `https://aiapi.shiwuyan.cn/v1`。

> 注：图片模型**不能用** `/v1/chat/completions`（那是文本端点，会报不支持），必须用 `/v1/images/generations`。

---

## 二、工具一览

### 1. `list_models`
列出当前可用模型 ID（图片 / LLM），用于排查 Key 与账号开通情况。无需参数。

### 2. `generate_image`（文生图）
| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `prompt` | string | 提示词（必填） |
| `model` | string | 默认 `gpt-image-2-code`，可选 `gpt-image-2` / `gpt-image-2-code` / `gpt-image-2-code2` / `gpt-image-2-code3` |
| `n` | int 1-4 | 张数，默认 1 |
| `size` | string | `1:1` / `16:9` / `1024x1024` / `1024x1792` 等 |
| `quality` | enum | `low` / `medium` / `high` |
| `style` | enum | `natural` / `vivid` |
| `background` | enum | `auto` / `opaque` / `transparent` |
| `output_format` | enum | `png` / `jpeg` / `webp` |
| `output_compression` | int 0-100 | 用于 jpeg/webp |
| `response_format` | enum | `url` / `b64_json`（见下方实测结论） |
| `upscale` | enum | `2k` / `4k`（仅部分模型支持） |
| `output_path` | string | 可选，保存到本地路径 |

返回：图片本身（base64 PNG，客户端直接渲染）+ `revised_prompt`。

### 3. `edit_image`（图生图 / 编辑）
| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `prompt` | string | 编辑要求（必填），如「改成白底产品图，真实摄影」 |
| `image_path` | string | 本地参考图路径（必填），如 `./ref.png` |
| `mask_path` | string | 可选局部遮罩图路径 |
| `model` | string | 默认 `gpt-image-2-code`；可选 `gpt-image-2-code` / `gpt-image-2-code2` / `gpt-image-2-code3`（**已移除易超时的 adobe 系模型**） |
| `n` / `size` / `quality` / `background` / `output_format` / `output_compression` / `upscale` / `output_path` | — | 同文生图 |

返回：编辑后的图片本身（base64 PNG，客户端直接渲染）。

> 💡 用法示例：先本地准备好一张图 `ref.png`，让助手「基于 ref.png 把背景改成雪山」，助手会调用 `edit_image` 传入该路径。

---

## 三、实测结论（用测试 Key 跑过）

- ✅ **文生图全部参数可用**：`model`(含 code 系列)、`n`、`size`(比例与像素)、`quality`、`style`、`background`、`output_format`(jpeg/webp)、`output_compression`、`upscale=4k` 均返回 200 且出图。
- ⚠️ **`response_format=url` 实际未生效**：该接口**始终返回 `b64_json`**，不返回 url。工具默认用 `b64_json` 直接渲染图片，无影响。
- ✅ **图生图（/images/edits）**：`gpt-image-2-code` 编辑成功返回图片（已用测试 Key 端到端验证）。默认即 `gpt-image-2-code`，不再暴露易超时的 adobe 系模型选项。
- ❌ **上游失败时统一提示**：任何来自官方接口的失败（限流、Key 失效、服务端异常等），用户端只看到「官方接口繁忙，生成失败」，不暴露内部报错。

> 注意：图片生成单次约 10–60 秒（服务端渲染），调用时请耐心等待。

---

## 四、安装与构建

```bash
cd image-gen-mcp
npm install
npm run build          # 编译到 dist/
```

环境变量（也可在客户端 mcp 配置的 `env` 里直接给）：
- `IMAGE_API_KEY`：**必填**，你的 API Key
- `IMAGE_API_BASE_URL`：默认 `https://aiapi.shiwuyan.cn/v1`
- `IMAGE_API_MODEL`：默认图片模型 `gpt-image-2-code`

---

## 五、WorkBuddy 用户如何调用（两种接入方式）

### 方式 A：图形化「自定义 MCP」（最接近一键导入）
1. WorkBuddy 左侧「连接器」→ 右上角「自定义 MCP」/「MCP 服务器」→「配置 MCP」
2. 粘贴下面的配置（把 Key 换成你自己的），保存
3. 在连接器列表找到该条目 → 点「**信任 / 启用**」
4. **完全退出并重启 WorkBuddy**（MCP 进程需重载），出现绿点即生效
5. 对话里直接说「帮我生成一张……的图片」

### 方式 B：直接编辑配置文件
编辑 `~/.workbuddy/mcp.json`（没有就新建），写入下方配置，保存后按方式 A 第 3-4 步信任并重启。

### 配置片段（复制即用）
```json
{
  "mcpServers": {
    "image-gen": {
      "command": "node",
      "args": ["/绝对路径/image-gen-mcp/dist/index.js"],
      "env": {
        "IMAGE_API_KEY": "sk-你的key",
        "IMAGE_API_BASE_URL": "https://aiapi.shiwuyan.cn/v1",
        "IMAGE_API_MODEL": "gpt-image-2-code"
      }
    }
  }
}
```
> - Windows 路径用 `/` 或双反斜 `\\`，**不要把 Key 写进 `args`，统一放 `env`**。
> - Key 走环境变量，本项目源码不硬编码任何 Key。

---

## 六、分发与多用户

### A. 已发布到 npm（推荐给最终用户，零路径）
包名 `@aaa147258qq/image-gen-mcp` 已发布到 npm，并配置好 `bin` 入口。用户**无需下载代码、无需写路径**，配置里直接：
```json
{
  "mcpServers": {
    "image-gen": {
      "command": "npx",
      "args": ["-y", "@aaa147258qq/image-gen-mcp"],
      "env": { "IMAGE_API_KEY": "sk-你的key" }
    }
  }
}
```
首次运行 `npx` 会自动拉取最新版。导入文件见 `workbuddy-import-npx.json`（用户导入后只填 Key 即可）。

发布命令（需先 `npm login` 登录你的 npm 账号）：
```bash
cd image-gen-mcp
npm run build
npm publish --access=public   # 已配 publishConfig.access=public，scoped 包需显式指定
```

### B. 本地 stdio（开发 / 自测）
每个用户在自己机器装 Node + 本服务 + 自己的 Key，最安全。配置见 `workbuddy-import.json`（需填 `dist/index.js` 的绝对路径）。

### C. 远程托管（多用户共用）
若要统一管 Key、免安装，可改成 HTTP/SSE 常驻服务（SDK 已支持 `StreamableHTTPServerTransport`，复用现有工具逻辑）。需要我补一份远程版可直接说。

---

## 七、变更记录

- **v3.0.0**：移除视频相关能力（seedance `generate_video` / `query_video` / `upload_media`）。上游失败时统一对用户返回「官方接口繁忙，生成失败」。
- **v3.1.0**：应需求把图生图（`edit_image`）加回，但**默认模型改为稳定的 `gpt-image-2-code`，不再提供易超时的 adobe 系模型**。现共 3 个工具：`list_models` / `generate_image` / `edit_image`。实测：文生图、图生图均正常出图，上游失败统一返回「官方接口繁忙，生成失败」。
