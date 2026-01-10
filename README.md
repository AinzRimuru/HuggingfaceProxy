# HuggingFace Proxy

🤗 一个简洁高效的 HuggingFace 代理服务，基于 Cloudflare Workers。
体验地址：https://hf.rimuru.cc

## ✨ 特性

- **零配置使用** - 直接访问即可，所有请求自动转发到 HuggingFace
- **智能重定向** - 自动处理 CDN 重定向，无需多域名配置
- **下载器脚本** - 提供 Python 下载器，支持并行下载、断点续传
- **模块化架构** - 代码结构清晰，易于维护和扩展

## 📁 项目结构

```
hf_proxy/
├── src/                       # 源代码目录
│   ├── config.js              # 配置文件
│   ├── utils.js               # 工具函数
│   ├── handlers.js            # 请求处理器
│   ├── index.js               # 主入口
│   ├── templates/             # HTML 模板
│   │   └── home.html          # 首页模板
│   └── scripts/               # 脚本文件
│       └── hf_downloader.py   # Python 下载器
├── build.js                   # 构建脚本
├── _worker.js                 # 构建产物 (自动生成)
├── package.json
├── wrangler.toml
└── README.md
```

## 🚀 快速开始

### 部署到 Cloudflare Pages

1. Fork 本仓库
2. 在 Cloudflare Dashboard 创建 Pages 项目，连接 GitHub 仓库
3. 推送代码到 `main` 分支，GitHub Actions 会自动构建 `_worker.js`
4. Cloudflare Pages 自动拉取最新代码并部署

部署完成后，Cloudflare 会自动分配一个 `*.pages.dev` 域名，也可以在项目设置中绑定自定义域名。

> **注意**: `_worker.js` 已添加到 `.gitignore`，仅由 GitHub Actions 构建并强制提交。

### 本地开发

```bash
# 安装依赖
npm install

# 构建并启动开发服务器
npm run dev

# 仅构建
npm run build

# 部署
npm run deploy
```

## 📖 使用方法

> ⚠️ **注意**: 不推荐使用 `huggingface-cli` 或 `snapshot_download` 搭配本代理。由于 Cloudflare 的缓存机制会覆盖或丢失 `Content-Length` / `X-Linked-Size` 等关键头信息，这会导致这些严格校验的客户端下载失败。请使用本项目自带的下载脚本，已专门优化以避开此问题。

### 直接访问

直接访问代理域名根路径即可查看使用示例和说明。

```bash
# 访问模型页面
https://your-proxy.com/bert-base-uncased

# 下载模型文件
https://your-proxy.com/bert-base-uncased/resolve/main/config.json

# API 调用
https://your-proxy.com/api/models/bert-base-uncased
```

### 使用下载器脚本

```bash
# 下载脚本
curl -O https://your-proxy.com/hf_downloader.py

# 安装依赖
pip install requests tqdm

# 下载模型
python hf_downloader.py bert-base-uncased
python hf_downloader.py openai/whisper-large-v3 --type model
python hf_downloader.py bigcode/starcoder --revision main --workers 8

# 网络优化选项
python hf_downloader.py bert-base-uncased -4   # 强制使用 IPv4
python hf_downloader.py bert-base-uncased -6   # 强制使用 IPv6
# 注：脚本会自动检测教育网环境（CERNET），如检测到则默认开启 IPv6 优化，无需手动指定
```

## 🔧 工作原理

### 路由规则

| 请求路径 | 转发到 |
|---------|--------|
| `/api/models/xxx` | `huggingface.co/api/models/xxx` |
| `/bert-base/resolve/main/config.json` | `huggingface.co/bert-base/resolve/main/config.json` |
| `/redirect_to_cdn.hf.co/path/file` | `cdn.hf.co/path/file` |

### 重定向处理

当 HuggingFace 返回重定向到 CDN 节点时，Worker 会自动改写 Location：

```
原始: Location: https://cdn-lfs.hf.co/path/to/file
改写: Location: https://your-proxy.com/redirect_to_cdn-lfs.hf.co/path/to/file
```

## 📝 配置说明

编辑 `src/config.js` 可以修改：

```javascript
// 允许的上游域名列表
export const ALLOWED_UPSTREAM_DOMAINS = [
    'huggingface.co',
];

// 默认上游域名
export const DEFAULT_UPSTREAM = 'huggingface.co';

// 重定向前缀
export const REDIRECT_PREFIX = 'redirect_to_';
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=AinzRimuru/HuggingfaceProxy&type=date&legend=top-left)](https://www.star-history.com/#AinzRimuru/HuggingfaceProxy&type=date&legend=top-left)
