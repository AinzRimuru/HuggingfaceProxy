#!/usr/bin/env python3
"""
Hugging Face 文件下载器
通过代理服务器下载 Hugging Face 仓库文件

使用方法:
    python hf_downloader.py <repo_id> [选项]
    
示例:
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
import shutil
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
    print("请先安装 requests: pip install requests")
    sys.exit(1)

# ============== 配置 ==============
# 注意: 通过 https://xx.xxx.com/hf_downloader.py 下载时，
# Worker 会自动将下面的域名替换为请求的域名
PROXY_DOMAIN = "{{PROXY_DOMAIN}}"  # 你的代理域名
MAX_RETRIES = 3                    # 最大重试次数
CHUNK_SIZE = 64 * 1024 * 1024      # 64MB 每块
DEFAULT_WORKERS = 4                # 默认并行下载数


def check_cernet() -> bool:
    """检查是否为教育网环境"""
    try:
        #设置较短超时，避免阻塞
        resp = requests.get("http://ip-api.com/json/?fields=isp,org", timeout=3)
        if resp.ok:
            data = resp.json()
            isp = data.get("isp", "").lower()
            org = data.get("org", "").lower()
            # 常见的教育网标识
            cernet_keywords = ["cernet", "education", "university"]
            if any(k in isp for k in cernet_keywords) or any(k in org for k in cernet_keywords):
                return True
    except:
        pass
    return False


def configure_dns(force_ipv4: bool = False, force_ipv6: bool = False):
    """配置 DNS 解析优先级"""
    if not (force_ipv4 or force_ipv6):
        return
        
    original_getaddrinfo = socket.getaddrinfo
    
    def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        # 如果强制指定了协议版本，则覆盖 family 参数
        if force_ipv4:
            family = socket.AF_INET
        elif force_ipv6:
            family = socket.AF_INET6
        return original_getaddrinfo(host, port, family, type, proto, flags)
        
    socket.getaddrinfo = patched_getaddrinfo


def get_hf_hub_cache() -> Path:
    """获取 HuggingFace Hub cache 根目录"""
    # 优先级: HF_HUB_CACHE > HF_HOME/hub > ~/.cache/huggingface/hub
    hub_cache = os.environ.get("HF_HUB_CACHE")
    if hub_cache:
        return Path(hub_cache)
    hf_home = os.environ.get("HF_HOME")
    if hf_home:
        return Path(hf_home) / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"


def resolve_commit_sha(session, base_url: str, api_prefix: str, revision: str) -> str:
    """通过 API 获取 revision 对应的 commit SHA"""
    url = f"{base_url}{api_prefix}/revision/{revision}"
    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["sha"]
    except Exception as e:
        print(f"⚠️ 获取 commit SHA 失败: {e}")
        raise


def compute_sha256(file_path: Path) -> str:
    """计算文件的 SHA256 哈希"""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(8 * 1024 * 1024)  # 8MB chunks
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()


def import_to_cache(output_dir: Path, repo_id: str, repo_type: str,
                    revision: str, commit_sha: str, file_list: List[FileInfo]) -> None:
    """将下载好的文件导入到 HuggingFace Hub cache 格式"""
    # 构建缓存目录名: models--org--repo / datasets--org--repo / spaces--org--repo
    prefix = {"model": "models", "dataset": "datasets", "space": "spaces"}[repo_type]
    safe_name = repo_id.replace("/", "--")
    cache_repo_dir = get_hf_hub_cache() / f"{prefix}--{safe_name}"

    blobs_dir = cache_repo_dir / "blobs"
    snapshots_dir = cache_repo_dir / "snapshots" / commit_sha
    refs_dir = cache_repo_dir / "refs"

    blobs_dir.mkdir(parents=True, exist_ok=True)
    snapshots_dir.mkdir(parents=True, exist_ok=True)
    refs_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📦 正在导入到 HF cache: {cache_repo_dir}")

    for file_info in file_list:
        src_file = output_dir / file_info.path
        if not src_file.exists():
            print(f"  ⚠️ 跳过不存在的文件: {file_info.path}")
            continue

        # 计算 SHA256
        sha256_hash = compute_sha256(src_file)
        blob_path = blobs_dir / sha256_hash

        # 移动到 blobs（如已存在则跳过）
        if not blob_path.exists():
            shutil.move(str(src_file), str(blob_path))
        else:
            src_file.unlink()

        # 在 snapshots 中创建链接
        snapshot_path = snapshots_dir / file_info.path
        snapshot_path.parent.mkdir(parents=True, exist_ok=True)

        if snapshot_path.exists() or snapshot_path.is_symlink():
            snapshot_path.unlink()

        try:
            # 相对路径符号链接
            rel_blob = os.path.relpath(str(blob_path), str(snapshot_path.parent))
            os.symlink(rel_blob, str(snapshot_path))
        except OSError:
            # Windows fallback: 复制
            shutil.copy2(str(blob_path), str(snapshot_path))

    # 写入 refs
    ref_file = refs_dir / revision
    ref_file.write_text(commit_sha)

    # 删除原始下载目录
    shutil.rmtree(output_dir, ignore_errors=True)

    print(f"✅ 导入完成: {cache_repo_dir}")
    print(f"   snapshots/{commit_sha[:12]}.../ ({len(file_list)} 个文件)")
    print(f"   refs/{revision} -> {commit_sha[:12]}...")


@dataclass
class FileInfo:
    """文件信息"""
    path: str           # 相对路径
    size: int           # 文件大小 (bytes)
    oid: str            # 文件 OID (用于 LFS)
    lfs: bool           # 是否是 LFS 文件
    download_url: str   # 下载地址


class HFDownloader:
    """Hugging Face 下载器"""
    
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
        
        # 设置输出目录
        if output_dir:
            self.output_dir = Path(output_dir)
        else:
            # 默认使用仓库名作为目录
            safe_name = repo_id.replace("/", "_")
            self.output_dir = Path.cwd() / safe_name
            
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 构建基础 URL (直接使用代理域名，默认转发到 huggingface.co)
        self.base_url = f"https://{proxy_domain}"
        
        # API 路径前缀
        if repo_type == "dataset":
            self.api_prefix = f"/api/datasets/{repo_id}"
            self.download_prefix = f"/datasets/{repo_id}/resolve/{revision}"
        elif repo_type == "space":
            self.api_prefix = f"/api/spaces/{repo_id}"
            self.download_prefix = f"/spaces/{repo_id}/resolve/{revision}"
        else:  # model
            self.api_prefix = f"/api/models/{repo_id}"
            self.download_prefix = f"/{repo_id}/resolve/{revision}"
        
        # Session 配置
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "HF-Downloader/1.0 (Python)"
        })
        if self.token:
            self.session.headers["Authorization"] = f"Bearer {self.token}"
    
    def get_file_list(self) -> List[FileInfo]:
        """获取仓库中所有文件的列表"""
        url = f"{self.base_url}{self.api_prefix}/tree/{self.revision}"
        
        print(f"📂 正在获取文件列表: {url}")
        
        all_files = []
        self._fetch_tree_recursive("", all_files)
        
        print(f"✅ 共发现 {len(all_files)} 个文件")
        return all_files
    
    def _fetch_tree_recursive(self, path: str, files: List[FileInfo]) -> None:
        """递归获取目录树"""
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
                    
                    # 构建下载 URL
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
            print(f"⚠️ 获取文件列表失败: {e}")
            raise
    
    def download_file(self, file_info: FileInfo, progress_bar: Optional[tqdm] = None) -> bool:
        """下载单个文件"""
        output_path = self.output_dir / file_info.path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 检查是否已存在且大小相同
        if output_path.exists() and output_path.stat().st_size == file_info.size:
            if progress_bar:
                progress_bar.update(file_info.size)
            return True
        
        # 支持断点续传
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
                
                # 处理重定向后的响应
                if resp.status_code == 416:  # Range Not Satisfiable - 文件已完整
                    if progress_bar:
                        progress_bar.update(file_info.size - resume_pos)
                    return True
                    
                resp.raise_for_status()
                
                # 确定写入模式
                mode = "ab" if resume_pos > 0 and resp.status_code == 206 else "wb"
                if mode == "wb":
                    resume_pos = 0  # 重新下载
                
                with open(output_path, mode) as f:
                    for chunk in resp.iter_content(chunk_size=CHUNK_SIZE):
                        if chunk:
                            f.write(chunk)
                            if progress_bar:
                                progress_bar.update(len(chunk))
                
                return True
                
            except Exception as e:
                print(f"\n⚠️ 下载失败 ({attempt + 1}/{MAX_RETRIES}): {file_info.path} - {e}")
                if attempt < MAX_RETRIES - 1:
                    import time
                    time.sleep(2 ** attempt)  # 指数退避
        
        return False
    
    def download_all(self, files: Optional[List[FileInfo]] = None) -> Dict[str, Any]:
        """下载所有文件"""
        if files is None:
            files = self.get_file_list()
        
        if not files:
            print("⚠️ 没有找到任何文件")
            return {"success": 0, "failed": 0, "skipped": 0}
        
        # 计算总大小
        total_size = sum(f.size for f in files)
        print(f"\n📦 准备下载 {len(files)} 个文件, 总大小: {self._format_size(total_size)}")
        print(f"📁 输出目录: {self.output_dir}")
        print(f"🔧 并行数: {self.workers}\n")
        
        # 显示文件列表
        print("=" * 60)
        print(f"{'文件名':<45} {'大小':>12}")
        print("=" * 60)
        for f in files[:10]:  # 只显示前10个
            name = f.path if len(f.path) <= 45 else "..." + f.path[-42:]
            print(f"{name:<45} {self._format_size(f.size):>12}")
        if len(files) > 10:
            print(f"... 还有 {len(files) - 10} 个文件")
        print("=" * 60 + "\n")
        
        # 创建进度条
        progress = tqdm(
            total=total_size,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
            desc="下载进度"
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
        
        # 使用线程池并行下载
        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            futures = [executor.submit(download_task, f) for f in files]
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    print(f"\n❌ 任务异常: {e}")
        
        progress.close()
        
        # 打印结果
        print("\n" + "=" * 60)
        print(f"✅ 下载完成: {results['success']}/{len(files)} 个文件成功")
        if results["failed"] > 0:
            print(f"❌ 失败文件: {results['failed']} 个")
            for f in results["failed_files"]:
                print(f"   - {f}")
        print("=" * 60)
        
        return results
    
    @staticmethod
    def _format_size(size: int) -> str:
        """格式化文件大小"""
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} PB"


def main():
    parser = argparse.ArgumentParser(
        description="通过代理下载 Hugging Face 仓库文件",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    %(prog)s bert-base-uncased
    %(prog)s openai/whisper-large-v3 --type model
    %(prog)s bigcode/starcoder --revision main --workers 8
    %(prog)s microsoft/phi-2 --output ./my_models
        """
    )
    
    parser.add_argument("repo_id", help="仓库 ID (例如: bert-base-uncased 或 openai/whisper-large-v3)")
    parser.add_argument("--type", "-t", choices=["model", "dataset", "space"], 
                        default="model", help="仓库类型 (默认: model)")
    parser.add_argument("--revision", "-r", default="main", 
                        help="分支/版本 (默认: main)")
    parser.add_argument("--output", "-o", help="输出目录")
    parser.add_argument("--workers", "-w", type=int, default=DEFAULT_WORKERS,
                        help=f"并行下载数 (默认: {DEFAULT_WORKERS})")
    parser.add_argument("--proxy", "-p", default=PROXY_DOMAIN,
                        help=f"代理域名 (默认: {PROXY_DOMAIN})")
    parser.add_argument("--token", help="Hugging Face Token (也可设置 HF_TOKEN 环境变量)")
    parser.add_argument("--list-only", "-l", action="store_true",
                        help="仅列出文件，不下载")
    parser.add_argument("--ipv4", "-4", action="store_true", help="强制使用 IPv4")
    parser.add_argument("--ipv6", "-6", action="store_true", help="强制使用 IPv6")
    parser.add_argument("--cache", "-c", action="store_true",
                        help="下载完成后导入到 HuggingFace Hub cache (支持 from_pretrained 直接加载)")
    
    args = parser.parse_args()

    # 处理 IP 协议选择
    if args.ipv4 and args.ipv6:
        print("❌ 错误: 不能同时指定 -4 和 -6")
        sys.exit(1)
        
    use_ipv6 = args.ipv6
    use_ipv4 = args.ipv4
    
    # 如果未指定，自动检测是否为教育网
    if not (use_ipv6 or use_ipv4):
        if check_cernet():
            print("🎓 检测到教育网环境，自动启用 IPv6 优化")
            use_ipv6 = True
            
    if use_ipv6:
        print("🌐 已启用强制 IPv6 解析")
        configure_dns(force_ipv6=True)
    elif use_ipv4:
        print("🌐 已启用强制 IPv4 解析")
        configure_dns(force_ipv4=True)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║          🤗 Hugging Face 代理下载器                          ║
╠══════════════════════════════════════════════════════════════╣
║  仓库: {args.repo_id:<53} ║
║  类型: {args.type:<53} ║
║  分支: {args.revision:<53} ║
║  代理: {args.proxy:<53} ║
╚══════════════════════════════════════════════════════════════╝
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
        print("\n📋 文件列表:")
        print("=" * 70)
        for f in files:
            lfs_tag = "[LFS]" if f.lfs else ""
            print(f"{f.path:<50} {downloader._format_size(f.size):>12} {lfs_tag}")
        print("=" * 70)
        print(f"总计: {len(files)} 个文件, {downloader._format_size(sum(f.size for f in files))}")
    else:
        files = downloader.get_file_list()
        results = downloader.download_all(files)

        # 下载成功后导入到 HF cache
        if args.cache and results["failed"] == 0:
            try:
                commit_sha = resolve_commit_sha(
                    downloader.session, downloader.base_url,
                    downloader.api_prefix, downloader.revision
                )
                import_to_cache(
                    downloader.output_dir, args.repo_id, args.type,
                    args.revision, commit_sha, files
                )
            except Exception as e:
                print(f"\n❌ 导入 cache 失败: {e}")
                print(f"   文件仍保留在: {downloader.output_dir}")


if __name__ == "__main__":
    main()
