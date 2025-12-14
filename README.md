# Hugging Face Proxy (Cloudflare Workers)

这是一个基于 Cloudflare Workers (或 Cloudflare Pages Functions) 的轻量级反向代理，用于访问 Hugging Face (`huggingface.co`) 及其相关 CDN 资源 (`*.hf.co`)。

## ✨ 功能特点

*   **主站代理**: 将指定子域名（默认 `hf`）代理到 `huggingface.co`。
*   **CDN 资源代理**: 智能处理 Hugging Face 的 CDN 域名（如 `cas-bridge.xethub.hf.co`），通过特殊的子域名格式进行映射。
*   **重定向重写**: 自动拦截并重写 301/302 重定向响应中的 `Location` 头，确保用户始终停留在你的代理域名下，而不是跳转回原始的 Hugging Face 域名。
*   **动态域名**: 自动识别当前访问的根域名，无需硬编码，方便部署。

## 🚀 部署方法

你可以选择使用 Cloudflare Pages 或 Cloudflare Workers 进行部署。

### 方法一：使用 Cloudflare Pages (推荐)

1.  **Fork 或上传代码**: 将本项目代码上传到 GitHub 或直接在本地准备好。
2.  **创建项目**: 在 Cloudflare Dashboard 中创建一个新的 Pages 项目。
3.  **连接 Git**: 如果使用 Git，连接你的仓库。
4.  **构建设置**:
    *   **构建命令**: (留空)
    *   **构建输出目录**: (留空，或者填 `.`)
    *   Cloudflare 会自动识别 `_worker.js` 并将其作为 Functions 部署。
5.  **绑定域名**:
    *   部署完成后，在项目的 "Custom Domains" 设置中绑定你的自定义域名（例如 `hf.yourdomain.com`）。
    *   **重要**: 为了支持 CDN 代理，建议添加一个泛域名解析（Wildcard DNS），例如 `*.yourdomain.com` CNAME 到你的 Pages 项目地址。或者至少确保你访问的子域名已解析。

### 方法二：使用 Wrangler CLI (本地开发/部署)

1.  安装依赖:
    ```bash
    npm install
    ```

2.  本地测试:
    ```bash
    npm run dev
    ```

3.  部署到 Cloudflare:
    ```bash
    npm run deploy
    ```

## ⚙️ 配置说明

### 1. 修改入口前缀

打开 `_worker.js` 文件，修改顶部的配置：

```javascript
const MAIN_SUBDOMAIN = 'hf'; // 你的主入口前缀
```

*   如果你的域名是 `example.com`，且 `MAIN_SUBDOMAIN` 为 `hf`，则主站访问地址为 `https://hf.example.com`。

### 2. DNS 解析设置

为了让代理正常工作，你需要正确配置 DNS 记录。假设你的根域名是 `example.com`：

| 类型 | 名称 | 内容 | 说明 |
| :--- | :--- | :--- | :--- |
| CNAME | `hf` | `project-name.pages.dev` | 主入口 (对应 MAIN_SUBDOMAIN) |
| CNAME | `*` | `project-name.pages.dev` | **(推荐)** 泛解析，用于处理动态 CDN 子域名 |

> 如果无法设置泛解析，你需要手动添加所有可能用到的 CDN 子域名记录，这非常麻烦，因此强烈建议使用泛解析。

如果你必须手动添加，以下是常见的需要配置的子域名列表（CNAME 到你的 Pages/Workers 地址）：

*   `cas-bridge---xethub`
*   `cdn-lfs-eu-1`
*   `cdn-lfs-us-1`
*   `cdn-lfs`

## 🔍 工作原理

### 域名映射规则

脚本通过子域名来判断代理目标：

1.  **主站**:
    *   访问: `hf.example.com`
    *   代理目标: `huggingface.co`

2.  **CDN 资源**:
    *   Hugging Face 的 CDN 域名通常包含多个点，例如 `cas-bridge.xethub.hf.co`。
    *   由于多级子域名证书和 DNS 的限制，本代理使用 `---` (三个短横线) 来代替原域名中的点 `.`。
    *   访问: `cas-bridge---xethub.example.com`
    *   代理目标: `cas-bridge.xethub.hf.co`

### 重定向处理

当 Hugging Face 返回 `302 Found` 跳转到 CDN 下载链接时，脚本会拦截这个响应：
1.  读取 `Location` 头（例如 `https://cas-bridge.xethub.hf.co/...`）。
2.  将域名转换为代理格式（`https://cas-bridge---xethub.example.com/...`）。
3.  返回修改后的 `Location` 给浏览器。

## ⚠️ 注意事项

*   请确保不要滥用此代理，遵守 Cloudflare 和 Hugging Face 的使用条款。
*   本通过 Cloudflare Workers 转发流量，会消耗你的 Workers/Pages 额度。
