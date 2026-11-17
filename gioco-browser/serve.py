# Server locale senza cache (per provare il gioco): python3 serve.py [porta]
import http.server, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
http.server.ThreadingHTTPServer(("", int(sys.argv[1]) if len(sys.argv) > 1 else 8755), H).serve_forever()
