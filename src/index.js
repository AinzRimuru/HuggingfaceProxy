/**
 * HuggingFace 代理 Worker (极简版)
 *
 * 路由规则：
 * - 默认请求 → 直接转发到 huggingface.co
 * - /redirect_to_{domain}/... → 转发到 {domain}/...
 *
 * 重定向处理：
 * - 如果目标是 huggingface.co → 保持原路径
 * - 如果目标是其他允许的域名 → 添加 /redirect_to_{domain} 前缀
 *
 * 环境变量：
 * - RESTRICT_BROWSER_ACCESS: 限制浏览器访问 (true/false)
 *   - true: 浏览器只能访问首页和脚本下载页面
 *   - false 或未设置: 不限制
 */

import { handleHome, handleDownloaderScript, handleProxy } from './handlers.js';
import { validateBrowserAccess } from './utils.js';
import { REDIRECT_PREFIX } from './config.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const hostname = url.hostname;
        const pathname = url.pathname;

        // 浏览器访问限制检查
        const restrictBrowserAccess = env.RESTRICT_BROWSER_ACCESS === 'true';
        const accessCheck = validateBrowserAccess(request, pathname, restrictBrowserAccess);
        if (accessCheck) {
            return accessCheck;
        }

        // 路由分发
        switch (true) {
            // 首页
            case pathname === '/' || pathname === '':
                return handleHome(hostname);

            // 下载器脚本
            case pathname === '/hf_downloader.py':
                return handleDownloaderScript(hostname);

            // 代理请求
            default: {
                // 限流：按客户端 IP，每 10 秒 10 次。
                // 下载路径 (/resolve/、/redirect_to_*) 与其他路径 (如 /api/) 用不同 key 独立计数，
                // 互不挤占额度。绑定未配置（env.RATE_LIMITER 为空）时自动跳过，不影响可用性。
                if (env.RATE_LIMITER) {
                    const ip = request.headers.get('cf-connecting-ip') || 'anon';
                    const isDownload = pathname.includes('/resolve/') || pathname.startsWith(`/${REDIRECT_PREFIX}`);
                    const { success } = await env.RATE_LIMITER.limit({
                        key: `${ip}:${isDownload ? 'dl' : 'api'}`
                    });
                    if (!success) {
                        return new Response('Too Many Requests', {
                            status: 429,
                            headers: {
                                'Retry-After': '10',
                                'Content-Type': 'text/plain; charset=utf-8'
                            }
                        });
                    }
                }
                return handleProxy(request, url);
            }
        }
    }
};
