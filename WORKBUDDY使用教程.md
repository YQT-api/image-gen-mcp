# WorkBuddy 接入「图片生成 MCP」详细教程

本教程面向 **最终用户**，手把手教你怎么把 `image-gen-mcp` 接进 WorkBuddy，然后直接对话生成图片。
全程无需写代码，按图索骥即可。

---

## 目录
1. 你需要准备什么
2. 第一步：把服务文件放到本地
3. 第二步：安装 Node 并构建服务
4. 第三步：拿到你的 API Key
5. 第四步：把 MCP 服务接进 WorkBuddy（两种方式）
6. 第五步：信任并重启，确认生效
7. 第六步：开始对话生成图片
8. 常用提示词示例
9. 参数速查表
10. 常见问题排查

---

## 1. 你需要准备什么

| 项目 | 说明 |
| --- | --- |
| 一台电脑（Win / macOS / Linux） | 本地运行 MCP 服务用 |
| Node.js | 建议 18 以上版本，[官网下载](https://nodejs.org) 一路下一步装好 |
| 本服务的文件 | `image-gen-mcp/` 整个文件夹（含 `dist/index.js`） |
| 一个 API Key | 在 `aiapi.shiwuyan.cn` 平台获取 |

---

## 2. 第一步：把服务文件放到本地

把 `image-gen-mcp/` 文件夹放到你习惯的位置，例如：
- Windows：`C:/Users/你的用户名/WorkBuddy/image-gen-mcp/`
- macOS：`/Users/你的用户名/WorkBuddy/image-gen-mcp/`

> 记住这个**绝对路径**，第 5 步配置要用到。

---

## 3. 第二步：安装 Node 并构建服务

打开「终端 / 命令行」（`Win+R` 输入 `cmd` 回车），执行：

```bash
# 进入服务目录（请替换成你的真实路径）
cd C:/Users/你的用户名/WorkBuddy/image-gen-mcp

# 安装依赖
npm install

# 编译生成可执行文件
npm run build
```

看到 `dist/index.js` 文件生成，说明构建成功。

> 如果提示 `npm 不是内部或外部命令`，说明 Node.js 没装好，先去装 Node 再回来。

---

## 4. 第三步：拿到你的 API Key

1. 登录 `aiapi.shiwuyan.cn` 平台
2. 在「API 密钥 / Key 管理」页面创建或复制你的 Key
3. Key 形如 `sk-xxxxxxxxxxxxxxxx`

> ⚠️ Key 是你账号的凭证，**不要发给别人，也不要写进代码或公开位置**。

---

## 5. 第四步：把 MCP 服务接进 WorkBuddy

有两种方式，**任选其一**。

### 方式 A：图形化界面（推荐，最像「一键导入」）

1. 打开 WorkBuddy，看**左侧栏**，找到「连接器」入口。
2. 右上角点「**自定义 MCP** / **MCP 服务器**」→「**配置 MCP**」。
3. 在弹出的框里粘贴下面这段配置（把 Key 和路径换成你自己的）：

```json
{
  "mcpServers": {
    "image-gen": {
      "command": "node",
      "args": ["C:/Users/你的用户名/WorkBuddy/image-gen-mcp/dist/index.js"],
      "env": {
        "IMAGE_API_KEY": "sk-你的key",
        "IMAGE_API_BASE_URL": "https://aiapi.shiwuyan.cn/v1",
        "IMAGE_API_MODEL": "gpt-image-2-code"
      }
    }
  }
}
```

4. 点保存。

### 方式 B：直接改配置文件

1. 打开文件管理器，进入你的用户目录，找到（或新建）文件：
   - Windows：`C:/Users/你的用户名/.workbuddy/mcp.json`
   - macOS：`/Users/你的用户名/.workbuddy/mcp.json`
2. 把上面那段 JSON **整个写进去**并保存。

> 💡 关键点：
> - Windows 路径用正斜杠 `/`（如 `C:/Users/...`）或双反斜杠 `\\`，别用单反斜杠。
> - **Key 必须放在 `env` 里**，不要塞进 `args`，更安全。

---

## 6. 第五步：信任并重启，确认生效

无论用方式 A 还是 B，接下来都一样：

1. 在 WorkBuddy 的「连接器」列表里，找到刚加的 `image-gen`。
2. 点它右侧的「**信任 / 启用**」按钮（不信任，MCP 工具不会被加载）。
3. **完全退出 WorkBuddy**（不只是关窗口，要从托盘/菜单退出），再重新打开。
   > MCP 进程只在启动时加载，必须重启才会生效。
4. 重新打开后，连接器列表里 `image-gen` 旁边出现**绿色圆点**，就说明接好了。

---

## 7. 第六步：开始对话生成图片

服务支持两种用法：**文生图**和**图生图（基于参考图编辑）**。

### 7.1 文生图（直接描述）
直接在对话输入框里用自然语言描述你想要的图即可，例如：

- 「帮我生成一张赛博朋克风格的城市夜景，霓虹灯，雨夜」
- 「画一只戴着墨镜的猫，卡通风格，白底」
- 「生成一张 16:9 的清新茶饮海报，ins 风」

WorkBuddy 会自动调用 `generate_image` 工具，把图片渲染在对话里。

### 7.2 图生图（基于一张图来改）
如果你本地已有一张图，想让 AI 基于它重绘/修改：

1. 把参考图放到本地，比如 `C:/Users/你的用户名/Pictures/ref.png`。
2. 在对话里说，例如：
   - 「基于 `C:/Users/你的用户名/Pictures/ref.png` 这张图，把背景改成雪山，保持主体不变」
   - 「用 ref.png，改成白底产品图，真实摄影风格」
3. WorkBuddy 会调用 `edit_image` 工具，读取你本地的图、上传并生成结果，渲染在对话里。

> 💡 图生图默认使用稳定的 `gpt-image-2-code` 模型（已实测可用）。路径要写**绝对路径**，且图片文件确实存在于该位置。

> 图片生成单次约 10–60 秒，请稍等，进度走完图片就出来了。

---

## 8. 常用提示词示例

| 你想要 | 可以这样说 |
| --- | --- |
| 指定比例 | 「生成一张 16:9 的……横版壁纸」 |
| 指定风格 | 「吉卜力动画风格的一棵樱花树」 |
| 指定画质 | 「高清写实摄影，一只站在雪山上的鹰」 |
| 透明背景 | 「一个透明背景的咖啡杯图标，用于 App」 |
| 多张 | 「生成 4 张不同构图的极简 logo 草图」 |

---

## 9. 参数速查表

如果你用「高级模式 / 直接传参」调用工具，可参考这些参数：

| 参数 | 可选值 | 默认 |
| --- | --- | --- |
| `model` | gpt-image-2 / gpt-image-2-code / gpt-image-2-code2 / gpt-image-2-code3 / gpt-image-2-adobe-code | gpt-image-2-code |
| `n` | 1 / 2 / 3 / 4 | 1 |
| `size` | 1:1 / 16:9 / 9:16 / 1024x1024 / 1024x1792 / 1792x1024 | 1:1 |
| `quality` | low / medium / high | （不填） |
| `style` | natural / vivid | （不填） |
| `background` | auto / opaque / transparent | （不填） |
| `output_format` | png / jpeg / webp | （不填） |
| `output_compression` | 0–100 | （不填） |
| `upscale` | 2k / 4k | （不填） |

> 注意：该接口**始终返回图片本身（base64）**，`response_format=url` 不生效，无需设置。

---

## 10. 常见问题排查

| 现象 | 原因 & 解决办法 |
| --- | --- |
| 列表里没有 `image-gen` / 没有绿点 | 没保存配置或没点「信任 / 启用」，回到第 5 步；确认已**完整重启** WorkBuddy |
| 对话里说生成图片没反应 | MCP 没生效。退出重开 WorkBuddy；检查 `mcp.json` 路径和 JSON 格式是否正确 |
| 提示「缺少环境变量 IMAGE_API_KEY」 | 配置里的 `env` 没填 Key，或 Key 写错了位置 |
| 提示「官方接口繁忙，生成失败」 | 官方接口暂时不可用 / 你的 Key 失效 / 额度用完。换时间重试，或去平台检查 Key 与余额 |
| 图生图提示「读取参考图失败」 | 你给的图片路径不存在或拼错。检查 `image_path` 是否为本机真实存在的**绝对路径** |
| 生成很慢 | 正常现象，服务端渲染需 10–60 秒，耐心等待即可 |
| 想换默认模型 | 在 `env` 里改 `IMAGE_API_MODEL` 的值，重启生效 |

---

> 本服务仅做接口封装与转发，**不存储你的 Key、不留存生成内容**。Key 与额度由 `aiapi.shiwuyan.cn` 平台侧管理。
