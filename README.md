# HuggingFace Proxy

🤗 一个简洁高效的 HuggingFace 代理服务，基于 Cloudflare Workers。
体验地址：https://hf.rimuru.work

## ✨ 特性

- **零配置使用** - 直接访问即可，所有请求自动转发到 HuggingFace
- **智能重定向** - 自动处理 CDN 重定向，无需多域名配置
- **下载器脚本** - 提供 Python 下载器，支持并行下载、断点续传、HF Cache 导入
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
3. 在项目的 **Settings → Builds & deployments → Build configurations** 中设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `.`
4. 推送代码到 `main` 分支，Cloudflare Pages 会自动拉取代码、执行构建并部署

部署完成后，Cloudflare 会自动分配一个 `*.pages.dev` 域名，也可以在项目设置中绑定自定义域名。

> **注意**: `_worker.js` 是构建产物，已添加到 `.gitignore`，不会进入 git 历史。Cloudflare Pages 会在部署时通过 `npm run build` 自动生成。

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

# 查看当前部署版本 (git commit hash)
https://your-proxy.com/version
```

### 查看部署版本

访问 `/version` 返回当前部署对应的 git commit hash（构建时注入，便于确认线上版本）：

```bash
curl https://your-proxy.com/version
# 803de27fa8fbb8dbfc6da7763e8b6999109e4dee
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

### 导入到 HuggingFace Cache

使用 `--cache` 参数，下载完成后自动将文件导入到 HuggingFace Hub 标准缓存目录，`transformers` 等库可直接命中缓存，无需重新下载。

```bash
# 下载并导入到 cache
python hf_downloader.py bert-base-uncased --cache

# 指定输出目录 + cache 导入（下载完成后 output 目录会被清理）
python hf_downloader.py bert-base-uncased --output ./tmp --cache
```

导入后的缓存结构：

```
~/.cache/huggingface/hub/
  models--bert-base-uncased/
    refs/
      main                          # commit SHA
    blobs/
      {sha256}                      # 文件内容
    snapshots/
      {commit_sha}/                 # 文件名 -> blobs 的链接
        config.json
        model.safetensors
        ...
```

在 Python 中直接使用：

```python
from transformers import AutoModel, AutoTokenizer

# 直接从缓存加载，不会重新下载
model = AutoModel.from_pretrained("bert-base-uncased")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
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

### 环境变量

在 Cloudflare Pages 设置中可以配置以下环境变量：

| 变量名 | 说明 | 可选值 |
|--------|------|--------|
| `RESTRICT_BROWSER_ACCESS` | 限制浏览器直接访问代理 | `true` / `false` (未设置默认为 `false`) |

- `RESTRICT_BROWSER_ACCESS=true` 时，浏览器只能访问首页 (`/`) 和脚本下载页面 (`/hf_downloader.py`)，其他路径将被拒绝
- 适用于希望限制浏览器直接下载，强制使用 Python 脚本的场景

### 代码配置

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

### 下载器 User-Agent

`hf_downloader.py` 发出的所有请求（API、下载、教育网检测）统一携带专用 UA：

```
HF-Downloader/2.0 (+https://github.com/AinzRimuru/HuggingfaceProxy)
```

如需阻止其他脚本滥用代理，可在 Cloudflare 安全规则（域名 → Security → Security Rules → 自定义规则）中按 UA 前缀放行，动作设为 Block：

```
(not starts_with(http.user_agent, "HF-Downloader/") and not http.request.uri.path in {"/" "/robots.txt" "/hf_downloader.py" "/version"} and not starts_with(http.request.uri.path, "/OUTDATED_SCRIPT"))
```

效果：首页、robots.txt、脚本下载、版本接口对所有客户端开放；其余路径仅允许携带 `HF-Downloader/` 前缀 UA 的请求（新旧脚本都放行，版本校验由 Worker 完成）。UA 可伪造，仅作基础过滤。

### 旧版脚本升级提示

边缘规则只按前缀放行，版本校验在 Worker 内完成（`src/config.js` 的 `SCRIPT_USER_AGENT`）：

- UA 为 `HF-Downloader/` 前缀但不等于当前版本 → 302 重定向到 `/OUTDATED_SCRIPT/re-download-hf_downloader.py` 并返回 410
- 旧脚本报错行会打印完整 URL（`requests` 的 `raise_for_status` 只输出状态码和 URL），提示直接可见：

```
410 Client Error: Gone for url: https://your-proxy.com/OUTDATED_SCRIPT/re-download-hf_downloader.py
```

- `/OUTDATED_SCRIPT` 前缀需在安全规则中放行（见上式），用户用浏览器打开可看到完整的升级说明页
- 升级脚本 UA 版本时，需同步修改 `src/scripts/hf_downloader.py` 的 `USER_AGENT` 与 `src/config.js` 的 `SCRIPT_USER_AGENT`

## Star History

<!-- star-history:start -->
<!-- 图表由 .github/workflows/star-history.yml 在 CI 中渲染并提交到独立的 `star-history` 分支；
     main 分支不存放任何图表产物，文件名固定，由 workflow 定期覆盖刷新。
     因 api.star-history.com 托管 API 自 2026-06-30 起失效，故改用自托管静态文件（不再依赖 sealed_token）。 -->
<a href="https://www.star-history.com/?repos=AinzRimuru%2FHuggingfaceProxy&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/AinzRimuru/HuggingfaceProxy@star-history/assets/star-history/star-history-dark.svg" />
   <img alt="Star History Chart" src="https://cdn.jsdelivr.net/gh/AinzRimuru/HuggingfaceProxy@star-history/assets/star-history/star-history-light.svg" />
 </picture>
</a>
<!-- star-history:end -->
