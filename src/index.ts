import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";

// ---- 配置（全部来自环境变量，绝不硬编码 Key） ----
const API_BASE = (process.env.IMAGE_API_BASE_URL ?? "https://aiapi.shiwuyan.cn/v1").replace(/\/$/, "");
const API_KEY = process.env.IMAGE_API_KEY;
const DEFAULT_IMG_MODEL = process.env.IMAGE_API_MODEL ?? "gpt-image-2-code";

const server = new McpServer({
  name: "image-gen-mcp",
  version: "3.0.0",
});

// ---------- 通用请求辅助 ----------
async function callJson(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

// 上游（官方接口）失败时，统一对用户返回这句话，不暴露内部报错细节
function upstreamFail() {
  return { isError: true, content: [{ type: "text" as const, text: "官方接口繁忙，生成失败" }] };
}

async function callForm(path: string, fields: Record<string, string | number>, files: Record<string, { buf: Buffer; name: string; type: string }>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  for (const [k, f] of Object.entries(files)) {
    fd.append(k, new Blob([f.buf as unknown as BlobPart], { type: f.type }), f.name);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: fd,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function needKey() {
  if (!API_KEY) {
    return { isError: true, content: [{ type: "text" as const, text: "缺少环境变量 IMAGE_API_KEY，请在启动 MCP 服务时配置你的 API Key。" }] };
  }
  return null;
}

const IMG_MODELS = "gpt-image-2 / gpt-image-2-code / gpt-image-2-code2 / gpt-image-2-code3";
const EDIT_MODELS = "gpt-image-2-code / gpt-image-2-code2 / gpt-image-2-code3";

// ---------- 1. 列出可用模型 ----------
server.tool("list_models", "列出接口当前可用的模型 ID（图片/视频/LLM）。用于排查 Key 与账号开通情况。", {}, async () => {
  const r = await fetch(`${API_BASE}/models`, { headers: { Authorization: `Bearer ${API_KEY}` } });
  const text = await r.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  const ids = (json?.data ?? []).map((m: any) => m.id).filter(Boolean);
  return { content: [{ type: "text" as const, text: ids.length ? ids.join("\n") : `HTTP ${r.status}: ${text.slice(0, 200)}` }] };
});

// ---------- 2. 文生图 ----------
server.tool(
  "generate_image",
  "根据文本提示词生成图片。支持尺寸/质量/风格/背景/格式/高清放大等全部参数，直接返回图片。（注意：接口当前始终返回 base64 图片，response_format=url 实际未生效）",
  {
    prompt: z.string().describe("图片描述 / 提示词（必填）"),
    model: z.string().optional().default(DEFAULT_IMG_MODEL).describe(`图片模型，默认 ${DEFAULT_IMG_MODEL}。可选：${IMG_MODELS}`),
    n: z.number().int().min(1).max(4).optional().default(1).describe("生成张数 1-4，默认 1"),
    size: z.string().optional().default("1:1").describe("比例或尺寸，如 1:1、16:9、1024x1024、1024x1792"),
    quality: z.enum(["low", "medium", "high"]).optional().describe("画质：low / medium / high"),
    style: z.enum(["natural", "vivid"]).optional().describe("风格：natural（自然）/ vivid（鲜艳）"),
    background: z.enum(["auto", "opaque", "transparent"]).optional().describe("背景：auto / opaque / transparent"),
    output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("输出格式：png / jpeg / webp"),
    output_compression: z.number().int().min(0).max(100).optional().describe("压缩率 0-100，用于 jpeg / webp"),
    response_format: z.enum(["url", "b64_json"]).optional().default("b64_json").describe("返回方式：url（链接）或 b64_json（内联图片）"),
    upscale: z.enum(["2k", "4k"]).optional().describe("高清放大：2k / 4k（仅部分模型支持）"),
    output_path: z.string().optional().describe("可选：把图片保存到本地文件路径，例如 ./out.png"),
  },
  async (a) => {
    const err = needKey(); if (err) return err;
    const body: Record<string, any> = { model: a.model, prompt: a.prompt, n: a.n, size: a.size, response_format: a.response_format };
    if (a.quality) body.quality = a.quality;
    if (a.style) body.style = a.style;
    if (a.background) body.background = a.background;
    if (a.output_format) body.output_format = a.output_format;
    if (a.output_compression != null) body.output_compression = a.output_compression;
    if (a.upscale) body.upscale = a.upscale;

    const r = await callJson("/images/generations", body);
    if (r.status !== 200 || !r.json?.data?.length) {
      return upstreamFail();
    }
    const content: any[] = [];
    for (const item of r.json.data) {
      if (item.b64_json) {
        if (a.output_path) { await writeFile(a.output_path, Buffer.from(item.b64_json, "base64")); content.push({ type: "text", text: `已保存：${a.output_path}` }); }
        content.push({ type: "image", data: item.b64_json, mimeType: "image/png" });
      } else if (item.url) {
        const line = `图片链接：${item.url}`;
        content.push({ type: "text", text: a.output_path ? `${line}\n(已保存到 ${a.output_path})` : line });
        if (a.output_path) { try { const u = await fetch(item.url); const ab = Buffer.from(await u.arrayBuffer()); await writeFile(a.output_path, ab); } catch {} }
      }
      if (item.revised_prompt) content.push({ type: "text", text: `revised_prompt: ${item.revised_prompt}` });
    }
    return { content };
  }
);

// ---------- 3. 图生图 / 编辑 ----------
server.tool(
  "edit_image",
  "基于一张参考图进行重绘/编辑（multipart）。支持尺寸/质量/高清放大等参数，直接返回图片。默认使用稳定的 gpt-image-2-code 模型。",
  {
    prompt: z.string().describe("编辑或重绘要求（必填），例如：改成白底产品图，真实摄影"),
    image_path: z.string().describe("本地参考图路径（必填），如 ./ref.png"),
    mask_path: z.string().optional().describe("可选局部编辑遮罩图路径"),
    model: z.string().optional().default("gpt-image-2-code").describe(`图片模型，默认 gpt-image-2-code。可选：${EDIT_MODELS}`),
    n: z.number().int().min(1).max(4).optional().default(1).describe("生成张数 1-4"),
    size: z.string().optional().default("1024x1024").describe("尺寸，如 1024x1024、1:1"),
    quality: z.enum(["low", "medium", "high"]).optional().describe("画质：low / medium / high"),
    background: z.enum(["auto", "opaque", "transparent"]).optional().describe("背景：auto / opaque / transparent"),
    output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("输出格式"),
    output_compression: z.number().int().min(0).max(100).optional().describe("压缩率 0-100"),
    response_format: z.enum(["url", "b64_json"]).optional().default("b64_json").describe("返回方式：url / b64_json"),
    upscale: z.enum(["2k", "4k"]).optional().describe("高清放大：2k / 4k"),
    output_path: z.string().optional().describe("可选：保存到本地路径"),
  },
  async (a) => {
    const err = needKey(); if (err) return err;
    let imgBuf: Buffer, imgName: string, imgType: string;
    try {
      imgBuf = await readFile(a.image_path);
      imgName = a.image_path.split(/[\\/]/).pop() || "image.png";
      imgType = a.image_path.toLowerCase().endsWith(".png") ? "image/png" : a.image_path.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
    } catch (e) {
      return { isError: true, content: [{ type: "text" as const, text: `读取参考图失败：${(e as Error).message}` }] };
    }
    const fields: Record<string, string | number> = { model: a.model, prompt: a.prompt, n: a.n, size: a.size, response_format: a.response_format };
    if (a.quality) fields.quality = a.quality;
    if (a.background) fields.background = a.background;
    if (a.output_format) fields.output_format = a.output_format;
    if (a.output_compression != null) fields.output_compression = a.output_compression;
    if (a.upscale) fields.upscale = a.upscale;

    const files: Record<string, { buf: Buffer; name: string; type: string }> = { image: { buf: imgBuf, name: imgName, type: imgType } };
    if (a.mask_path) {
      try { const mb = await readFile(a.mask_path); files.mask = { buf: mb, name: a.mask_path.split(/[\\/]/).pop() || "mask.png", type: "image/png" }; } catch {}
    }
    const r = await callForm("/images/edits", fields, files);
    if (r.status !== 200 || !r.json?.data?.length) {
      return upstreamFail();
    }
    const content: any[] = [];
    for (const item of r.json.data) {
      if (item.b64_json) {
        if (a.output_path) { await writeFile(a.output_path, Buffer.from(item.b64_json, "base64")); content.push({ type: "text", text: `已保存：${a.output_path}` }); }
        content.push({ type: "image", data: item.b64_json, mimeType: "image/png" });
      } else if (item.url) {
        content.push({ type: "text", text: `图片链接：${item.url}` });
        if (a.output_path) { try { const u = await fetch(item.url); await writeFile(a.output_path, Buffer.from(await u.arrayBuffer())); } catch {} }
      }
    }
    return { content };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
