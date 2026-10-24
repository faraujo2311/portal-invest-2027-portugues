#!/usr/bin/env python3
"""Servidor local do Portal INVEST; não expõe o conteúdo à rede."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import threading
import webbrowser

os.chdir(Path(__file__).resolve().parent)
ADDRESS = 'http://127.0.0.1:8765'

class LocalHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # O YouTube exige origem identificável; nunca suprima o Referer.
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

try:
    server = ThreadingHTTPServer(('127.0.0.1', 8765), LocalHandler)
except OSError as exc:
    print('Não foi possível abrir a porta 8765:', exc)
    print('Se o portal já estiver aberto, volte à janela existente.')
    raise SystemExit(1)

print('\nINVEST — Portal de Língua Portuguesa')
print('Acesse:', ADDRESS)
print('Para encerrar, pressione Ctrl+C.')
threading.Timer(0.65, lambda: webbrowser.open(ADDRESS)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
