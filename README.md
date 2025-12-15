[English](#english) | [中文](#chinese)

<a id="english"></a>
# Hugging Face Proxy (Cloudflare Workers)

A lightweight reverse proxy based on Cloudflare Workers (or Cloudflare Pages Functions) for accessing Hugging Face (`huggingface.co`) and its related CDN resources (`*.hf.co`).

## 📖 About

This project is designed to solve the problem of being unable to directly download models and datasets from Hugging Face in China due to network restrictions. It provides a stable and fast proxy service, allowing you to access Hugging Face resources seamlessly.

## ✨ Features

*   **Main Site Proxy**: Proxies a specified subdomain (default `hf`) to `huggingface.co`.
*   **CDN Resource Proxy**: Intelligently handles Hugging Face CDN domains (e.g., `cas-bridge.xethub.hf.co`) via a special subdomain mapping format.
*   **Redirect Rewriting**: Automatically intercepts and rewrites `Location` headers in 301/302 redirects to ensure users stay on your proxy domain instead of being redirected back to the original Hugging Face domain.
*   **Dynamic Domain**: Automatically identifies the current root domain, requiring no hardcoding and making deployment easy.

## 🚀 Deployment

You can choose to deploy using Cloudflare Pages or Cloudflare Workers.

### Method 1: Fork & Deploy (Recommended)

1.  **Fork this project**: Click the `Fork` button in the top right corner of the GitHub repository to fork this project to your GitHub account.
2.  **Create Pages**: Log in to the Cloudflare Dashboard, navigate to `Workers & Pages` -> `Create Application` -> `Pages` -> `Connect to Git`.
3.  **Select Repository**: Select the repository you just forked and click `Begin setup`.
4.  **Build Settings**:
    *   **Framework preset**: `None`.
    *   **Build command**: (Leave empty).
    *   **Build output directory**: (Leave empty).
    *   Click `Save and Deploy`.
5.  **Bind Domain**:
    *   After deployment is complete, bind your custom domain (e.g., `hf.yourdomain.com`) in the project's "Custom Domains" settings.
    *   **Important**: To support CDN proxying, it is recommended to add a wildcard DNS record (Wildcard DNS), e.g., `*.yourdomain.com` CNAME to your Pages project address.

### Method 2: Manual Cloudflare Pages

1.  **Upload Code**: Upload the code of this project to GitHub or prepare it locally.
2.  **Create Project**: Create a new Pages project in the Cloudflare Dashboard.
3.  **Connect Git**: If using Git, connect your repository.
4.  **Build Settings**:
    *   **Build command**: (Leave empty).
    *   **Build output directory**: (Leave empty, or fill in `.`).
    *   Cloudflare will automatically recognize `_worker.js` and deploy it as Functions.
5.  **Bind Domain**: Same as above.

### Method 3: Using Wrangler CLI (Local Development/Deployment)

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Local testing:
    ```bash
    npm run dev
    ```

3.  Deploy to Cloudflare:
    ```bash
    npm run deploy
    ```

## ⚙️ Configuration

### 1. Modify Entry Prefix

Open the `_worker.js` file and modify the configuration at the top:

```javascript
const MAIN_SUBDOMAIN = 'hf'; // Your main entry prefix
```

*   If your domain is `example.com` and `MAIN_SUBDOMAIN` is `hf`, the main site access address is `https://hf.example.com`.

### 2. DNS Settings

For the proxy to work properly, you need to configure DNS records correctly. Assuming your root domain is `example.com`:

| Type | Name | Content | Description |
| :--- | :--- | :--- | :--- |
| CNAME | `hf` | `project-name.pages.dev` | Main entry (corresponds to MAIN_SUBDOMAIN) |
| CNAME | `*` | `project-name.pages.dev` | **(Recommended)** Wildcard resolution, used to handle dynamic CDN subdomains |

> If you cannot set up wildcard resolution, you need to manually add all possible CDN subdomain records. This is very cumbersome, so it is strongly recommended to use wildcard resolution.

If you must add them manually, here is a list of common subdomains that need to be configured (CNAME to your Pages/Workers address):

*   `cas-bridge---xethub`
*   `cdn-lfs-eu-1`
*   `cdn-lfs-us-1`
*   `cdn-lfs`

## 🔍 How it Works

### Domain Mapping Rules

The script determines the proxy target based on the subdomain:

1.  **Main Site**:
    *   Access: `hf.example.com`
    *   Proxy Target: `huggingface.co`

2.  **CDN Resources**:
    *   Hugging Face's CDN domains usually contain multiple dots, e.g., `cas-bridge.xethub.hf.co`.
    *   Due to multi-level subdomain certificate and DNS limitations, this proxy uses `---` (three dashes) to replace the dots `.` in the original domain.
    *   Access: `cas-bridge---xethub.example.com`
    *   Proxy Target: `cas-bridge.xethub.hf.co`

### Redirect Handling

When Hugging Face returns a `302 Found` redirect to a CDN download link, the script intercepts this response:
1.  Reads the `Location` header (e.g., `https://cas-bridge.xethub.hf.co/...`).
2.  Converts the domain to the proxy format (`https://cas-bridge---xethub.example.com/...`).
3.  Returns the modified `Location` to the browser.

## ⚠️ Notes

*   Please ensure not to abuse this proxy and comply with the terms of use of Cloudflare and Hugging Face.
*   Traffic forwarded through Cloudflare Workers will consume your Workers/Pages quota. The free tier is sufficient for general use, so there is no need to worry.

---

<a id="chinese"></a>
# Hugging Face Proxy (Cloudflare Workers)

这是一个基于 Cloudflare Workers (或 Cloudflare Pages Functions) 的轻量级反向代理，用于访问 Hugging Face (`huggingface.co`) 及其相关 CDN 资源 (`*.hf.co`)。

## 📖 关于本项目

本项目主要是用来解决国内无法直接下载 Hugging Face 模型和数据集的问题。通过 Cloudflare Workers 搭建的反向代理，提供稳定快速的访问服务，让你能够无缝获取 Hugging Face 的资源。

## ✨ 功能特点

*   **主站代理**: 将指定子域名（默认 `hf`）代理到 `huggingface.co`。
*   **CDN 资源代理**: 智能处理 Hugging Face 的 CDN 域名（如 `cas-bridge.xethub.hf.co`），通过特殊的子域名格式进行映射。
*   **重定向重写**: 自动拦截并重写 301/302 重定向响应中的 `Location` 头，确保用户始终停留在你的代理域名下，而不是跳转回原始的 Hugging Face 域名。
*   **动态域名**: 自动识别当前访问的根域名，无需硬编码，方便部署。

## 🚀 部署方法

你可以选择使用 Cloudflare Pages 或 Cloudflare Workers 进行部署。

### 方法一：Fork 项目直接部署 (最推荐)

1.  **Fork 本项目**: 点击 GitHub 仓库右上角的 `Fork` 按钮，将本项目复刻到你的 GitHub 账号。
2.  **创建 Pages**: 登录 Cloudflare Dashboard，进入 `Workers & Pages` -> `Create Application` -> `Pages` -> `Connect to Git`。
3.  **选择仓库**: 选择你刚才 Fork 的仓库，点击 `Begin setup`。
4.  **部署配置**:
    *   **Framework preset**: `None`。
    *   **Build command**: (留空)。
    *   **Build output directory**: (留空)。
    *   点击 `Save and Deploy`。
5.  **绑定域名**:
    *   部署完成后，在项目的 "Custom Domains" 设置中绑定你的自定义域名（例如 `hf.yourdomain.com`）。
    *   **重要**: 为了支持 CDN 代理，建议添加一个泛域名解析（Wildcard DNS），例如 `*.yourdomain.com` CNAME 到你的 Pages 项目地址。

### 方法二：手动创建 Cloudflare Pages

1.  **上传代码**: 将本项目代码上传到 GitHub 或直接在本地准备好。
2.  **创建项目**: 在 Cloudflare Dashboard 中创建一个新的 Pages 项目。
3.  **连接 Git**: 如果使用 Git，连接你的仓库。
4.  **构建设置**:
    *   **构建命令**: (留空)
    *   **构建输出目录**: (留空，或者填 `.`)
    *   Cloudflare 会自动识别 `_worker.js` 并将其作为 Functions 部署。
5.  **绑定域名**: 同上。

### 方法三：使用 Wrangler CLI (本地开发/部署)

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
*   本项目通过 Cloudflare Workers 转发流量，会消耗你的 Workers/Pages 额度。Workers 的免费额度足够用户使用，无需担心。
