/**
 * 请求处理器
 */

import { isAllowedUpstream, parseRequest, rewriteLocation } from './utils.js';
import { SCRIPT_USER_AGENT } from './config.js';
import HOME_HTML from './templates/home.html';
import HF_DOWNLOADER_SCRIPT from './scripts/hf_downloader.py';

/**
 * 处理首页请求
 * @param {string} hostname - 当前域名
 * @returns {Response}
 */
export function handleHome(hostname) {
    const html = HOME_HTML.replace(/\{\{HOSTNAME\}\}/g, hostname);
    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

/**
 * 处理下载器脚本请求
 * @param {string} hostname - 当前域名
 * @returns {Response}
 */
export function handleDownloaderScript(hostname) {
    const script = HF_DOWNLOADER_SCRIPT.replace(/\{\{PROXY_DOMAIN\}\}/g, hostname);
    return new Response(script, {
        status: 200,
        headers: {
            'Content-Type': 'text/x-python; charset=utf-8',
            'Content-Disposition': 'attachment; filename="hf_downloader.py"',
            'Cache-Control': 'no-cache'
        }
    });
}

/**
 * 处理 /version 请求
 * 返回当前部署对应的 git commit hash (构建时由 build.js 注入)
 * @returns {Response}
 */
export function handleVersion() {
    return new Response(`${__COMMIT_SHA__}\n`, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

/**
 * 处理 /robots.txt 请求
 * 反爬：仅允许抓取首页 (/)，其余路径全部禁止
 * 说明: Allow: /$ 中的 $ 为结尾锚点 (Google/Bing/百度等主流引擎均支持)，
 *       使 Allow 规则比 Disallow: / 更具体，从而只放行根路径
 * @returns {Response}
 */
export function handleRobots() {
    const body = 'User-agent: *\nAllow: /$\nDisallow: /\n';
    return new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            'X-Robots-Tag': 'noindex, nofollow'
        }
    });
}

/**
 * 处理旧版脚本的升级提示页 (/OUTDATED_SCRIPT*)
 * 旧版脚本请求被 302 重定向到此后返回 410，报错 URL 中自带升级提示；
 * 用户用浏览器打开该路径时可看到完整说明 (需在 CF 安全规则中放行此前缀)
 * @param {Request} request - 请求对象
 * @returns {Response}
 */
export function handleOutdated(request) {
    const userAgent = request.headers.get('User-Agent') || '(空)';
    const host = new URL(request.url).hostname;
    const isHtml = (request.headers.get('Accept') || '').includes('text/html');

    const downloadCmd = `curl -O https://${host}/hf_downloader.py`;
    const commonHeaders = { 'Cache-Control': 'no-store' };

    if (isHtml) {
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>脚本已停用</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:60px auto;padding:0 20px;line-height:1.7">
<h1>⚠️ 旧版下载脚本已停用</h1>
<p>您正在使用的 <code>hf_downloader.py</code> 版本过旧，其请求已被服务端拒绝。</p>
<p>请重新下载最新版脚本：</p>
<pre style="background:#2d2d2d;color:#f8f8f2;padding:14px;border-radius:8px">${downloadCmd}</pre>
<p>或访问 <a href="https://${host}/">首页</a> 查看使用说明。</p>
<hr><p style="color:#999;font-size:13px">当前要求的 User-Agent: <code>${SCRIPT_USER_AGENT}</code><br>您发送的 User-Agent: <code>${userAgent}</code></p>
</body></html>`;
        return new Response(html, {
            status: 410,
            headers: { ...commonHeaders, 'Content-Type': 'text/html; charset=utf-8' }
        });
    }

    const text =
        '旧版下载脚本已停用，请重新下载最新版脚本:\n' +
        `  ${downloadCmd}\n\n` +
        `您发送的 User-Agent: ${userAgent}\n` +
        `当前要求的 User-Agent: ${SCRIPT_USER_AGENT}\n`;
    return new Response(text, {
        status: 410,
        headers: { ...commonHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

/**
 * 处理代理请求
 * @param {Request} request - 原始请求
 * @param {URL} url - 解析后的 URL
 * @returns {Promise<Response>}
 */
export async function handleProxy(request, url) {
    const pathname = url.pathname;
    const proxyOrigin = url.origin;

    // 1. 解析请求，提取目标上游和实际路径
    const { upstream, path } = parseRequest(pathname);

    // 2. 验证上游域名是否被允许
    if (!isAllowedUpstream(upstream)) {
        return new Response(`Upstream not allowed: ${upstream}`, { status: 403 });
    }

    // 3. 构建发往源站的请求
    const upstreamUrl = new URL(path, `https://${upstream}`);
    upstreamUrl.search = url.search; // 保留查询参数

    const newRequest = new Request(upstreamUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual' // 【关键】手动拦截重定向
    });

    // 强制覆盖 Host 头
    newRequest.headers.set('Host', upstream);

    try {
        // 4. 发起请求
        const response = await fetch(newRequest);

        // 5. 拦截并重写重定向
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('Location');
            if (location) {
                const newLocation = rewriteLocation(location, proxyOrigin);
                if (newLocation) {
                    const newHeaders = new Headers(response.headers);
                    newHeaders.set('Location', newLocation);
                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders
                    });
                }
            }
        }

        // 6. 非重定向请求：改写 Link 分页头后返回
        //    HF API 分页时 Link: rel="next" 指向源站 huggingface.co，
        //    客户端无法直连源站，改写为代理域名后才能继续翻页
        const linkHeader = response.headers.get('Link');
        if (linkHeader && linkHeader.includes('https://huggingface.co')) {
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Link', linkHeader.replaceAll('https://huggingface.co', proxyOrigin));
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        }

        return response;

    } catch (e) {
        return new Response(`Proxy Error: ${e.message}`, { status: 502 });
    }
}
