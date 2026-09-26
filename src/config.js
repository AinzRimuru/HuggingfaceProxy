/**
 * 配置文件
 */

// 允许的上游域名列表 (用于验证重定向目标)
export const ALLOWED_UPSTREAM_DOMAINS = [
    'huggingface.co',
    // .hf.co 结尾的域名都是允许的 CDN 节点
];

// 默认上游域名
export const DEFAULT_UPSTREAM = 'huggingface.co';

// 重定向前缀
export const REDIRECT_PREFIX = 'redirect_to_';
