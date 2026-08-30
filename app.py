from __future__ import annotations

import os

from flask import Flask, Response, render_template, request

app = Flask(__name__)
@app.get("/")
def index():
    return render_template("index.html", canonical_url=request.url_root.rstrip("/"))


@app.get("/robots.txt")
def robots():
    base_url = request.url_root.rstrip("/")
    body = f"User-agent: *\nAllow: /\n\nSitemap: {base_url}/sitemap.xml\n"
    return Response(body, mimetype="text/plain")


@app.get("/sitemap.xml")
def sitemap():
    base_url = request.url_root.rstrip("/")
    body = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{base_url}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>'''
    return Response(body, mimetype="application/xml")


@app.get("/llms.txt")
def llms():
    base_url = request.url_root.rstrip("/")
    body = f'''# Sticker Cutter

> A free, private browser-based tool for cropping images into Telegram-ready static stickers.

Sticker Cutter creates 512 × 512 pixel PNG or WebP stickers. Images are processed entirely in the user's browser and are never uploaded, transmitted, or stored by the server.

## Main page

- [Telegram Sticker Cutter]({base_url}/): Upload an image locally, position and resize a square crop frame, include transparent space outside the image if needed, preview the result, and download a Telegram-ready sticker.

## Key facts

- Free to use; no account required.
- Supports JPG, PNG, and WebP source images up to 20 MB.
- Exports static stickers at 512 × 512 pixels as WebP or PNG.
- WebP export is compressed in-browser to meet Telegram's 512 KB limit.
- No image data leaves the browser.
'''
    return Response(body, mimetype="text/plain")


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
