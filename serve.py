#!/usr/bin/env python3
"""
DUSI-NET Local Preview Server
로컬 미리보기용 정적 파일 서버입니다.

사용법:
  python build.py --sync   ← 먼저 manifest 생성
  python serve.py           ← 서버 시작 (기본 포트 8080)
  python serve.py 3000      ← 포트 지정
"""

import http.server
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = Path(__file__).parent.resolve()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass

    def end_headers(self):
        # CORS for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def main():
    server = http.server.HTTPServer(('0.0.0.0', PORT), Handler)
    print(f'''
    ╔══════════════════════════════════════════════╗
    ║     DUSI-NET Local Preview Server            ║
    ╠══════════════════════════════════════════════╣
    ║  URL:     http://localhost:{PORT:<20}║
    ║  Root:    {str(ROOT)[:36]:<36}║
    ╠══════════════════════════════════════════════╣
    ║  Press Ctrl+C to shutdown                    ║
    ╚══════════════════════════════════════════════╝
    ''')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n    [DUSI-NET] Server shutdown.')
        server.server_close()


if __name__ == '__main__':
    main()
