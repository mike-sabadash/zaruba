from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request

DADATA_API_KEY = "b12a340f692efe389fa47fc8d534f30e0f50f9ed"  # ваш ключ

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/dadata':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            req = urllib.request.Request(
                'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
                data=post_data,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': f'Token {DADATA_API_KEY}'
                }
            )
            try:
                with urllib.request.urlopen(req) as response:
                    response_data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response_data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # заглушаем лишние логи
        pass

if __name__ == '__main__':
    port = 8080
    print(f"DaData proxy running on http://localhost:{port}/dadata")
    HTTPServer(('localhost', port), ProxyHandler).serve_forever()