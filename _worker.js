/**
 * HuggingFace Proxy Worker
 * 构建时间: 2026-01-17T02:44:01.683Z
 * 
 * 此文件由 build.js 自动生成，请勿手动编辑
 * 源代码位于 src/ 目录
 */


// src/config.js
var ALLOWED_UPSTREAM_DOMAINS = [
  "huggingface.co"
  // .hf.co 结尾的域名都是允许的 CDN 节点
];
var DEFAULT_UPSTREAM = "huggingface.co";
var REDIRECT_PREFIX = "redirect_to_";

// src/utils.js
function isAllowedUpstream(hostname) {
  if (ALLOWED_UPSTREAM_DOMAINS.includes(hostname)) {
    return true;
  }
  if (hostname.endsWith(".hf.co")) {
    return true;
  }
  return false;
}
function parseRequest(pathname) {
  const prefixPattern = new RegExp(`^/${REDIRECT_PREFIX}([^/]+)(/.*)$`);
  const match = pathname.match(prefixPattern);
  if (match) {
    return {
      upstream: match[1],
      path: match[2]
    };
  }
  return {
    upstream: DEFAULT_UPSTREAM,
    path: pathname
  };
}
function rewriteLocation(location, proxyOrigin) {
  try {
    const locUrl = new URL(location);
    const locHost = locUrl.hostname;
    if (!isAllowedUpstream(locHost)) {
      return null;
    }
    if (locHost === DEFAULT_UPSTREAM) {
      return `${proxyOrigin}${locUrl.pathname}${locUrl.search}`;
    } else {
      return `${proxyOrigin}/${REDIRECT_PREFIX}${locHost}${locUrl.pathname}${locUrl.search}`;
    }
  } catch (e) {
    console.error("Location parse error:", e);
    return null;
  }
}
function isBrowserRequest(request) {
  const accept = request.headers.get("Accept") || "";
  const userAgent = request.headers.get("User-Agent") || "";
  const acceptsHtml = accept.includes("text/html");
  const browserPatterns = [
    "Mozilla/",
    "Chrome/",
    "Safari/",
    "Firefox/",
    "Edge/",
    "Opera/",
    "MSIE",
    "Trident/",
    "SamsungBrowser/",
    "UCBrowser/"
  ];
  const isBrowserUA = browserPatterns.some((pattern) => userAgent.includes(pattern));
  const nonBrowserPatterns = [
    "curl/",
    "wget/",
    "Python-requests",
    "python-requests",
    "requests/",
    "go-http-tool",
    "Java/",
    "okhttp",
    "axios/",
    "node-fetch",
    "deno/",
    "libwww-perl",
    "lwp-trivial",
    "Git/",
    "git/",
    "GitHub-Hookshot",
    "HTTPie/",
    "http.rb/",
    "Ruby/",
    "PHP/",
    "PostmanRuntime/",
    "insomnia/",
    "Paw/",
    "REST Client",
    "Swift/",
    "Darwin/",
    "CF-Workers",
    "Cloudflare-Workers",
    "Worker/",
    "dart:io"
  ];
  const isToolUA = nonBrowserPatterns.some((pattern) => userAgent.includes(pattern));
  return acceptsHtml && isBrowserUA && !isToolUA;
}
function isAllowedBrowserPath(pathname) {
  const allowedPaths = ["/", "", "/hf_downloader.py"];
  return allowedPaths.includes(pathname);
}
function validateBrowserAccess(request, pathname, restrictBrowserAccess) {
  if (!restrictBrowserAccess) {
    return null;
  }
  if (isBrowserRequest(request) && !isAllowedBrowserPath(pathname)) {
    return new Response(
      "\u6D4F\u89C8\u5668\u8BBF\u95EE\u53D7\u9650\u3002\u8BF7\u4F7F\u7528 API \u5BA2\u6237\u7AEF\uFF08curl\u3001wget\u3001Python \u7B49\uFF09\u8BBF\u95EE\u6A21\u578B\u6587\u4EF6\u3002\n\n\u5141\u8BB8\u8BBF\u95EE\u7684\u9875\u9762\uFF1A\n  - / (\u9996\u9875)\n  - /hf_downloader.py (\u4E0B\u8F7D\u811A\u672C)",
      {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      }
    );
  }
  return null;
}

// src/templates/home.html
var home_default = `<!DOCTYPE html>
<html>
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-NLJ5RD4XBL"><\/script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-NLJ5RD4XBL');
    <\/script>
    <title>HuggingFace Proxy</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #fafafa;
            color: #333;
        }
        h1 {
            color: #ff9d00;
            margin-bottom: 10px;
        }
        h3 {
            color: #555;
            margin-top: 30px;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        code {
            background: #e8e8e8;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        }
        pre {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        pre code {
            background: transparent;
            padding: 0;
        }
        .comment {
            color: #6a9955;
        }
        a {
            color: #ff9d00;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .badge {
            display: inline-block;
            background: #ff9d00;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-left: 10px;
            vertical-align: middle;
        }
        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        .github-star {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #24292e 0%, #434d56 100%);
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .github-star:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            text-decoration: none;
            background: linear-gradient(135deg, #2d3439 0%, #535d66 100%);
        }
        .github-star svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }
        .github-star .star-icon {
            color: #f1c40f;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-row">
            <h1>\u{1F917} HuggingFace Proxy <span class="badge">v2.0</span></h1>
            <a href="https://github.com/AinzRimuru/HuggingfaceProxy" target="_blank" class="github-star">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span class="star-icon">\u2B50</span>
                Star on GitHub
            </a>
        </div>
        <p>\u76F4\u63A5\u8BBF\u95EE\u5373\u53EF\uFF0C\u6240\u6709\u8BF7\u6C42\u81EA\u52A8\u8F6C\u53D1\u5230 HuggingFace\u3002</p>
        
        <h3>\u{1F4E6} \u8BBF\u95EE\u6A21\u578B</h3>
        <pre><code><span class="comment"># \u8BBF\u95EE\u6A21\u578B\u9875\u9762</span>
https://{{HOSTNAME}}/bert-base-uncased

<span class="comment"># \u4E0B\u8F7D\u6A21\u578B\u6587\u4EF6</span>
https://{{HOSTNAME}}/bert-base-uncased/resolve/main/config.json

<span class="comment"># API \u8C03\u7528</span>
https://{{HOSTNAME}}/api/models/bert-base-uncased</code></pre>

        <h3>\u{1F4E5} \u4E0B\u8F7D\u5668\u811A\u672C</h3>
        <pre><code><span class="comment"># \u4E0B\u8F7D Python \u811A\u672C</span>
curl -O https://{{HOSTNAME}}/hf_downloader.py

<span class="comment"># \u4F7F\u7528\u793A\u4F8B</span>
python hf_downloader.py bert-base-uncased
python hf_downloader.py openai/whisper-large-v3 --type model</code></pre>

        <h3>\u{1F517} \u73AF\u5883\u53D8\u91CF\u914D\u7F6E</h3>
        <pre><code><span class="comment"># \u8BBE\u7F6E HuggingFace \u955C\u50CF</span>
export HF_ENDPOINT=https://{{HOSTNAME}}</code></pre>
    </div>
</body>
</html>
`;

// src/scripts/hf_downloader.py
var hf_downloader_default = `#!/usr/bin/env python3
"""
Hugging Face \u6587\u4EF6\u4E0B\u8F7D\u5668
\u901A\u8FC7\u4EE3\u7406\u670D\u52A1\u5668\u4E0B\u8F7D Hugging Face \u4ED3\u5E93\u6587\u4EF6

\u4F7F\u7528\u65B9\u6CD5:
    python hf_downloader.py <repo_id> [\u9009\u9879]
    
\u793A\u4F8B:
    python hf_downloader.py bert-base-uncased
    python hf_downloader.py openai/whisper-large-v3 --type model
    python hf_downloader.py bigcode/starcoder --revision main --workers 8
"""

import argparse
import os
import sys
import socket
import json
import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, quote
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from tqdm import tqdm

try:
    import requests
except ImportError:
    print("\u8BF7\u5148\u5B89\u88C5 requests: pip install requests")
    sys.exit(1)

# ============== \u914D\u7F6E ==============
# \u6CE8\u610F: \u901A\u8FC7 https://xx.xxx.com/hf_downloader.py \u4E0B\u8F7D\u65F6\uFF0C
# Worker \u4F1A\u81EA\u52A8\u5C06\u4E0B\u9762\u7684\u57DF\u540D\u66FF\u6362\u4E3A\u8BF7\u6C42\u7684\u57DF\u540D
PROXY_DOMAIN = "{{PROXY_DOMAIN}}"  # \u4F60\u7684\u4EE3\u7406\u57DF\u540D
MAX_RETRIES = 3                    # \u6700\u5927\u91CD\u8BD5\u6B21\u6570
CHUNK_SIZE = 64 * 1024 * 1024      # 64MB \u6BCF\u5757
DEFAULT_WORKERS = 4                # \u9ED8\u8BA4\u5E76\u884C\u4E0B\u8F7D\u6570


def check_cernet() -> bool:
    """\u68C0\u67E5\u662F\u5426\u4E3A\u6559\u80B2\u7F51\u73AF\u5883"""
    try:
        #\u8BBE\u7F6E\u8F83\u77ED\u8D85\u65F6\uFF0C\u907F\u514D\u963B\u585E
        resp = requests.get("http://ip-api.com/json/?fields=isp,org", timeout=3)
        if resp.ok:
            data = resp.json()
            isp = data.get("isp", "").lower()
            org = data.get("org", "").lower()
            # \u5E38\u89C1\u7684\u6559\u80B2\u7F51\u6807\u8BC6
            cernet_keywords = ["cernet", "education", "university"]
            if any(k in isp for k in cernet_keywords) or any(k in org for k in cernet_keywords):
                return True
    except:
        pass
    return False


def configure_dns(force_ipv4: bool = False, force_ipv6: bool = False):
    """\u914D\u7F6E DNS \u89E3\u6790\u4F18\u5148\u7EA7"""
    if not (force_ipv4 or force_ipv6):
        return
        
    original_getaddrinfo = socket.getaddrinfo
    
    def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        # \u5982\u679C\u5F3A\u5236\u6307\u5B9A\u4E86\u534F\u8BAE\u7248\u672C\uFF0C\u5219\u8986\u76D6 family \u53C2\u6570
        if force_ipv4:
            family = socket.AF_INET
        elif force_ipv6:
            family = socket.AF_INET6
        return original_getaddrinfo(host, port, family, type, proto, flags)
        
    socket.getaddrinfo = patched_getaddrinfo


@dataclass
class FileInfo:
    """\u6587\u4EF6\u4FE1\u606F"""
    path: str           # \u76F8\u5BF9\u8DEF\u5F84
    size: int           # \u6587\u4EF6\u5927\u5C0F (bytes)
    oid: str            # \u6587\u4EF6 OID (\u7528\u4E8E LFS)
    lfs: bool           # \u662F\u5426\u662F LFS \u6587\u4EF6
    download_url: str   # \u4E0B\u8F7D\u5730\u5740


class HFDownloader:
    """Hugging Face \u4E0B\u8F7D\u5668"""
    
    def __init__(
        self,
        repo_id: str,
        repo_type: str = "model",
        revision: str = "main",
        output_dir: Optional[str] = None,
        proxy_domain: str = PROXY_DOMAIN,
        workers: int = DEFAULT_WORKERS,
        token: Optional[str] = None
    ):
        self.repo_id = repo_id
        self.repo_type = repo_type
        self.revision = revision
        self.proxy_domain = proxy_domain
        self.workers = workers
        self.token = token or os.environ.get("HF_TOKEN")
        
        # \u8BBE\u7F6E\u8F93\u51FA\u76EE\u5F55
        if output_dir:
            self.output_dir = Path(output_dir)
        else:
            # \u9ED8\u8BA4\u4F7F\u7528\u4ED3\u5E93\u540D\u4F5C\u4E3A\u76EE\u5F55
            safe_name = repo_id.replace("/", "_")
            self.output_dir = Path.cwd() / safe_name
            
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # \u6784\u5EFA\u57FA\u7840 URL (\u76F4\u63A5\u4F7F\u7528\u4EE3\u7406\u57DF\u540D\uFF0C\u9ED8\u8BA4\u8F6C\u53D1\u5230 huggingface.co)
        self.base_url = f"https://{proxy_domain}"
        
        # API \u8DEF\u5F84\u524D\u7F00
        if repo_type == "dataset":
            self.api_prefix = f"/api/datasets/{repo_id}"
            self.download_prefix = f"/datasets/{repo_id}/resolve/{revision}"
        elif repo_type == "space":
            self.api_prefix = f"/api/spaces/{repo_id}"
            self.download_prefix = f"/spaces/{repo_id}/resolve/{revision}"
        else:  # model
            self.api_prefix = f"/api/models/{repo_id}"
            self.download_prefix = f"/{repo_id}/resolve/{revision}"
        
        # Session \u914D\u7F6E
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "HF-Downloader/1.0 (Python)"
        })
        if self.token:
            self.session.headers["Authorization"] = f"Bearer {self.token}"
    
    def get_file_list(self) -> List[FileInfo]:
        """\u83B7\u53D6\u4ED3\u5E93\u4E2D\u6240\u6709\u6587\u4EF6\u7684\u5217\u8868"""
        url = f"{self.base_url}{self.api_prefix}/tree/{self.revision}"
        
        print(f"\u{1F4C2} \u6B63\u5728\u83B7\u53D6\u6587\u4EF6\u5217\u8868: {url}")
        
        all_files = []
        self._fetch_tree_recursive("", all_files)
        
        print(f"\u2705 \u5171\u53D1\u73B0 {len(all_files)} \u4E2A\u6587\u4EF6")
        return all_files
    
    def _fetch_tree_recursive(self, path: str, files: List[FileInfo]) -> None:
        """\u9012\u5F52\u83B7\u53D6\u76EE\u5F55\u6811"""
        params = {"recursive": "true"} if not path else {}
        
        if path:
            url = f"{self.base_url}{self.api_prefix}/tree/{self.revision}/{path}"
        else:
            url = f"{self.base_url}{self.api_prefix}/tree/{self.revision}"
            params["recursive"] = "true"
        
        try:
            resp = self.session.get(url, params=params, timeout=30)
            resp.raise_for_status()
            items = resp.json()
            
            for item in items:
                if item.get("type") == "file":
                    file_path = item["path"]
                    size = item.get("size", 0)
                    oid = item.get("oid", "")
                    lfs = item.get("lfs") is not None
                    
                    # \u6784\u5EFA\u4E0B\u8F7D URL
                    encoded_path = quote(file_path, safe="/")
                    download_url = f"{self.base_url}{self.download_prefix}/{encoded_path}"
                    
                    files.append(FileInfo(
                        path=file_path,
                        size=size,
                        oid=oid,
                        lfs=lfs,
                        download_url=download_url
                    ))
                    
        except requests.RequestException as e:
            print(f"\u26A0\uFE0F \u83B7\u53D6\u6587\u4EF6\u5217\u8868\u5931\u8D25: {e}")
            raise
    
    def download_file(self, file_info: FileInfo, progress_bar: Optional[tqdm] = None) -> bool:
        """\u4E0B\u8F7D\u5355\u4E2A\u6587\u4EF6"""
        output_path = self.output_dir / file_info.path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # \u68C0\u67E5\u662F\u5426\u5DF2\u5B58\u5728\u4E14\u5927\u5C0F\u76F8\u540C
        if output_path.exists() and output_path.stat().st_size == file_info.size:
            if progress_bar:
                progress_bar.update(file_info.size)
            return True
        
        # \u652F\u6301\u65AD\u70B9\u7EED\u4F20
        resume_pos = 0
        if output_path.exists():
            resume_pos = output_path.stat().st_size
        
        for attempt in range(MAX_RETRIES):
            try:
                headers = {}
                if resume_pos > 0:
                    headers["Range"] = f"bytes={resume_pos}-"
                
                resp = self.session.get(
                    file_info.download_url,
                    headers=headers,
                    stream=True,
                    timeout=60,
                    allow_redirects=True
                )
                
                # \u5904\u7406\u91CD\u5B9A\u5411\u540E\u7684\u54CD\u5E94
                if resp.status_code == 416:  # Range Not Satisfiable - \u6587\u4EF6\u5DF2\u5B8C\u6574
                    if progress_bar:
                        progress_bar.update(file_info.size - resume_pos)
                    return True
                    
                resp.raise_for_status()
                
                # \u786E\u5B9A\u5199\u5165\u6A21\u5F0F
                mode = "ab" if resume_pos > 0 and resp.status_code == 206 else "wb"
                if mode == "wb":
                    resume_pos = 0  # \u91CD\u65B0\u4E0B\u8F7D
                
                with open(output_path, mode) as f:
                    for chunk in resp.iter_content(chunk_size=CHUNK_SIZE):
                        if chunk:
                            f.write(chunk)
                            if progress_bar:
                                progress_bar.update(len(chunk))
                
                return True
                
            except Exception as e:
                print(f"\\n\u26A0\uFE0F \u4E0B\u8F7D\u5931\u8D25 ({attempt + 1}/{MAX_RETRIES}): {file_info.path} - {e}")
                if attempt < MAX_RETRIES - 1:
                    import time
                    time.sleep(2 ** attempt)  # \u6307\u6570\u9000\u907F
        
        return False
    
    def download_all(self, files: Optional[List[FileInfo]] = None) -> Dict[str, Any]:
        """\u4E0B\u8F7D\u6240\u6709\u6587\u4EF6"""
        if files is None:
            files = self.get_file_list()
        
        if not files:
            print("\u26A0\uFE0F \u6CA1\u6709\u627E\u5230\u4EFB\u4F55\u6587\u4EF6")
            return {"success": 0, "failed": 0, "skipped": 0}
        
        # \u8BA1\u7B97\u603B\u5927\u5C0F
        total_size = sum(f.size for f in files)
        print(f"\\n\u{1F4E6} \u51C6\u5907\u4E0B\u8F7D {len(files)} \u4E2A\u6587\u4EF6, \u603B\u5927\u5C0F: {self._format_size(total_size)}")
        print(f"\u{1F4C1} \u8F93\u51FA\u76EE\u5F55: {self.output_dir}")
        print(f"\u{1F527} \u5E76\u884C\u6570: {self.workers}\\n")
        
        # \u663E\u793A\u6587\u4EF6\u5217\u8868
        print("=" * 60)
        print(f"{'\u6587\u4EF6\u540D':<45} {'\u5927\u5C0F':>12}")
        print("=" * 60)
        for f in files[:10]:  # \u53EA\u663E\u793A\u524D10\u4E2A
            name = f.path if len(f.path) <= 45 else "..." + f.path[-42:]
            print(f"{name:<45} {self._format_size(f.size):>12}")
        if len(files) > 10:
            print(f"... \u8FD8\u6709 {len(files) - 10} \u4E2A\u6587\u4EF6")
        print("=" * 60 + "\\n")
        
        # \u521B\u5EFA\u8FDB\u5EA6\u6761
        progress = tqdm(
            total=total_size,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
            desc="\u4E0B\u8F7D\u8FDB\u5EA6"
        )
        
        results = {"success": 0, "failed": 0, "failed_files": []}
        lock = threading.Lock()
        
        def download_task(file_info: FileInfo) -> bool:
            success = self.download_file(file_info, progress)
            with lock:
                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1
                    results["failed_files"].append(file_info.path)
            return success
        
        # \u4F7F\u7528\u7EBF\u7A0B\u6C60\u5E76\u884C\u4E0B\u8F7D
        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            futures = [executor.submit(download_task, f) for f in files]
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    print(f"\\n\u274C \u4EFB\u52A1\u5F02\u5E38: {e}")
        
        progress.close()
        
        # \u6253\u5370\u7ED3\u679C
        print("\\n" + "=" * 60)
        print(f"\u2705 \u4E0B\u8F7D\u5B8C\u6210: {results['success']}/{len(files)} \u4E2A\u6587\u4EF6\u6210\u529F")
        if results["failed"] > 0:
            print(f"\u274C \u5931\u8D25\u6587\u4EF6: {results['failed']} \u4E2A")
            for f in results["failed_files"]:
                print(f"   - {f}")
        print("=" * 60)
        
        return results
    
    @staticmethod
    def _format_size(size: int) -> str:
        """\u683C\u5F0F\u5316\u6587\u4EF6\u5927\u5C0F"""
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} PB"


def main():
    parser = argparse.ArgumentParser(
        description="\u901A\u8FC7\u4EE3\u7406\u4E0B\u8F7D Hugging Face \u4ED3\u5E93\u6587\u4EF6",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
\u793A\u4F8B:
    %(prog)s bert-base-uncased
    %(prog)s openai/whisper-large-v3 --type model
    %(prog)s bigcode/starcoder --revision main --workers 8
    %(prog)s microsoft/phi-2 --output ./my_models
        """
    )
    
    parser.add_argument("repo_id", help="\u4ED3\u5E93 ID (\u4F8B\u5982: bert-base-uncased \u6216 openai/whisper-large-v3)")
    parser.add_argument("--type", "-t", choices=["model", "dataset", "space"], 
                        default="model", help="\u4ED3\u5E93\u7C7B\u578B (\u9ED8\u8BA4: model)")
    parser.add_argument("--revision", "-r", default="main", 
                        help="\u5206\u652F/\u7248\u672C (\u9ED8\u8BA4: main)")
    parser.add_argument("--output", "-o", help="\u8F93\u51FA\u76EE\u5F55")
    parser.add_argument("--workers", "-w", type=int, default=DEFAULT_WORKERS,
                        help=f"\u5E76\u884C\u4E0B\u8F7D\u6570 (\u9ED8\u8BA4: {DEFAULT_WORKERS})")
    parser.add_argument("--proxy", "-p", default=PROXY_DOMAIN,
                        help=f"\u4EE3\u7406\u57DF\u540D (\u9ED8\u8BA4: {PROXY_DOMAIN})")
    parser.add_argument("--token", help="Hugging Face Token (\u4E5F\u53EF\u8BBE\u7F6E HF_TOKEN \u73AF\u5883\u53D8\u91CF)")
    parser.add_argument("--list-only", "-l", action="store_true",
                        help="\u4EC5\u5217\u51FA\u6587\u4EF6\uFF0C\u4E0D\u4E0B\u8F7D")
    parser.add_argument("--ipv4", "-4", action="store_true", help="\u5F3A\u5236\u4F7F\u7528 IPv4")
    parser.add_argument("--ipv6", "-6", action="store_true", help="\u5F3A\u5236\u4F7F\u7528 IPv6")
    
    args = parser.parse_args()

    # \u5904\u7406 IP \u534F\u8BAE\u9009\u62E9
    if args.ipv4 and args.ipv6:
        print("\u274C \u9519\u8BEF: \u4E0D\u80FD\u540C\u65F6\u6307\u5B9A -4 \u548C -6")
        sys.exit(1)
        
    use_ipv6 = args.ipv6
    use_ipv4 = args.ipv4
    
    # \u5982\u679C\u672A\u6307\u5B9A\uFF0C\u81EA\u52A8\u68C0\u6D4B\u662F\u5426\u4E3A\u6559\u80B2\u7F51
    if not (use_ipv6 or use_ipv4):
        if check_cernet():
            print("\u{1F393} \u68C0\u6D4B\u5230\u6559\u80B2\u7F51\u73AF\u5883\uFF0C\u81EA\u52A8\u542F\u7528 IPv6 \u4F18\u5316")
            use_ipv6 = True
            
    if use_ipv6:
        print("\u{1F310} \u5DF2\u542F\u7528\u5F3A\u5236 IPv6 \u89E3\u6790")
        configure_dns(force_ipv6=True)
    elif use_ipv4:
        print("\u{1F310} \u5DF2\u542F\u7528\u5F3A\u5236 IPv4 \u89E3\u6790")
        configure_dns(force_ipv4=True)
    
    print(f"""
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551          \u{1F917} Hugging Face \u4EE3\u7406\u4E0B\u8F7D\u5668                          \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551  \u4ED3\u5E93: {args.repo_id:<53} \u2551
\u2551  \u7C7B\u578B: {args.type:<53} \u2551
\u2551  \u5206\u652F: {args.revision:<53} \u2551
\u2551  \u4EE3\u7406: {args.proxy:<53} \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
""")
    
    downloader = HFDownloader(
        repo_id=args.repo_id,
        repo_type=args.type,
        revision=args.revision,
        output_dir=args.output,
        proxy_domain=args.proxy,
        workers=args.workers,
        token=args.token
    )
    
    if args.list_only:
        files = downloader.get_file_list()
        print("\\n\u{1F4CB} \u6587\u4EF6\u5217\u8868:")
        print("=" * 70)
        for f in files:
            lfs_tag = "[LFS]" if f.lfs else ""
            print(f"{f.path:<50} {downloader._format_size(f.size):>12} {lfs_tag}")
        print("=" * 70)
        print(f"\u603B\u8BA1: {len(files)} \u4E2A\u6587\u4EF6, {downloader._format_size(sum(f.size for f in files))}")
    else:
        downloader.download_all()


if __name__ == "__main__":
    main()
`;

// src/handlers.js
function handleHome(hostname) {
  const html = home_default.replace(/\{\{HOSTNAME\}\}/g, hostname);
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
function handleDownloaderScript(hostname) {
  const script = hf_downloader_default.replace(/\{\{PROXY_DOMAIN\}\}/g, hostname);
  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hf_downloader.py"',
      "Cache-Control": "no-cache"
    }
  });
}
async function handleProxy(request, url) {
  const pathname = url.pathname;
  const proxyOrigin = url.origin;
  const { upstream, path } = parseRequest(pathname);
  if (!isAllowedUpstream(upstream)) {
    return new Response(`Upstream not allowed: ${upstream}`, { status: 403 });
  }
  const upstreamUrl = new URL(path, `https://${upstream}`);
  upstreamUrl.search = url.search;
  const newRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual"
    // 【关键】手动拦截重定向
  });
  newRequest.headers.set("Host", upstream);
  try {
    const response = await fetch(newRequest);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (location) {
        const newLocation = rewriteLocation(location, proxyOrigin);
        if (newLocation) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Location", newLocation);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        }
      }
    }
    return response;
  } catch (e) {
    return new Response(`Proxy Error: ${e.message}`, { status: 502 });
  }
}

// src/index.js
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const pathname = url.pathname;
    const restrictBrowserAccess = env.RESTRICT_BROWSER_ACCESS === "true";
    const accessCheck = validateBrowserAccess(request, pathname, restrictBrowserAccess);
    if (accessCheck) {
      return accessCheck;
    }
    switch (true) {
      // 首页
      case (pathname === "/" || pathname === ""):
        return handleHome(hostname);
      // 下载器脚本
      case pathname === "/hf_downloader.py":
        return handleDownloaderScript(hostname);
      // 代理请求
      default:
        return handleProxy(request, url);
    }
  }
};
export {
  index_default as default
};
