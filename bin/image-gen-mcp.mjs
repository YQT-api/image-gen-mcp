#!/usr/bin/env node
// image-gen-mcp 可执行入口：由 `npx -y image-gen-mcp` 或全局安装后直接调用。
// 仅负责拉起真正的服务（dist/index.js），所有逻辑都在那里。
await import("../dist/index.js");
