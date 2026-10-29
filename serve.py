"""
Vastu Gyan — local server for trying the app on a phone or tablet.

Serves only the app's own files (never .git, scratch/ or anything else in this folder)
to devices on the same Wi-Fi or hotspot, and prints the address to open on the phone.

    python serve.py            # port 5180
    python serve.py 8080       # another port
"""

import http.server
import os
import socket
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5180

# Everything the app needs, and nothing else
ALLOWED_FILES = {"index.html", "manifest.webmanifest", "sw.js"}
ALLOWED_DIRS = ("css/", "js/", "icons/")


def lan_addresses():
    """Best guess at this computer's addresses on the local network."""
    found = set()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # no packet is sent; this just picks the outgoing interface
            found.add(s.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            found.add(info[4][0])
    except OSError:
        pass
    return sorted(a for a in found if not a.startswith(("127.", "169.254.", "172.")))


class AppOnlyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".webmanifest": "application/manifest+json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
    }

    def _allowed(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        if path == "":
            return True
        if ".." in path or path.endswith("/"):
            return False
        return path in ALLOWED_FILES or path.startswith(ALLOWED_DIRS)

    def end_headers(self):
        # Always serve fresh files while you're testing changes
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if not self._allowed():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if not self._allowed():
            self.send_error(404)
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s  %s\n" % (self.address_string(), fmt % args))


def main():
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), AppOnlyHandler)
    print("\n  Vastu Gyan is running.\n")
    print(f"  On this computer:  http://localhost:{PORT}")
    for addr in lan_addresses():
        print(f"  On your phone:     http://{addr}:{PORT}")
    print("\n  The phone must be on the same Wi-Fi or hotspot. Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")


if __name__ == "__main__":
    main()
