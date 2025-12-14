/**
 * 配置区域
 * 请务必修改为你实际绑定的域名
 */
const MAIN_SUBDOMAIN = 'hf';             // 你的主入口前缀 (对应 hf.yourdomain.com)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // 自动获取主域名 (假设 hostname 格式为 prefix.root_domain)
    const firstDotIndex = hostname.indexOf('.');
    const MY_ROOT_DOMAIN = firstDotIndex !== -1 ? hostname.substring(firstDotIndex + 1) : hostname;

    // 1. 解析当前请求的目标 (Upstream)
    let upstreamHost = '';
    
    // 提取子域名部分 (例如: cas-bridge_xethub)
    // 逻辑：取第一个点之前的部分
    const prefix = firstDotIndex !== -1 ? hostname.substring(0, firstDotIndex) : '';
    
    if (prefix === MAIN_SUBDOMAIN) {
        // 主入口 -> huggingface.co
        upstreamHost = 'huggingface.co';
    } else {
        // CDN 映射逻辑:
        // 1. 将 --- 还原为点 . (cas-bridge---xethub -> cas-bridge.xethub)
        // 2. 补全 .hf.co 后缀
        upstreamHost = prefix.replace(/---/g, '.') + '.hf.co';
    }
    
    // 2. 构建发往源站的请求
    url.hostname = upstreamHost;
    url.protocol = 'https:';
    
    const newRequest = new Request(url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual' // 【关键】手动拦截 302 重定向
    });
    
    // 强制覆盖 Host 头，确保源站能处理
    newRequest.headers.set('Host', upstreamHost);
    
    try {
        // 3. 发起请求
        const response = await fetch(newRequest);
        
        // 4. 拦截并重写重定向 (301, 302, 307 等)
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('Location');
            if (location) {
                try {
                    const locUrl = new URL(location);
                    const locHost = locUrl.hostname;
                    let newPrefix = '';
                    let shouldRewrite = false;

                    // 判断重定向的目标地址
                    if (locHost === 'huggingface.co') {
                        // 如果跳回主站
                        newPrefix = MAIN_SUBDOMAIN;
                        shouldRewrite = true;
                    } else if (locHost.endsWith('.hf.co')) {
                        // 如果跳往 CDN (如 cas-bridge.xethub.hf.co)
                        // 逻辑: 去掉 .hf.co -> 将点 . 替换为 ---
                        const rawPrefix = locHost.slice(0, -6); // 移除 ".hf.co"
                        newPrefix = rawPrefix.replace(/\./g, '---');
                        shouldRewrite = true;
                    }

                    // 如果需要重写 Location
                    if (shouldRewrite) {
                        // 构造新的重定向地址指向你的域名
                        locUrl.hostname = `${newPrefix}.${MY_ROOT_DOMAIN}`;
                        locUrl.protocol = 'https:'; // 保持 HTTPS
                        
                        // 复制并修改响应头
                        const newHeaders = new Headers(response.headers);
                        newHeaders.set('Location', locUrl.toString());
                        
                        return new Response(response.body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: newHeaders
                        });
                    }
                } catch (e) {
                    console.error("Location parse error:", e);
                }
            }
        }
        
        // 5. 非重定向请求，直接返回数据
        return response;

    } catch (e) {
        return new Response(`Proxy Error: ${e.message}`, {status: 502});
    }
  }
};