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

// 下载脚本当前版本的 User-Agent
// 必须与 src/scripts/hf_downloader.py 中的 USER_AGENT 完全一致，升级脚本时需同步修改
export const SCRIPT_USER_AGENT = 'HF-Downloader/2.0 (+https://github.com/AinzRimuru/HuggingfaceProxy)';

// 旧版脚本请求被重定向到的自解释路径前缀 (返回 410 + 升级说明)
// 路径本身携带提示信息，使旧脚本报错行中直接可见
export const OUTDATED_PATH_PREFIX = '/OUTDATED_SCRIPT';
