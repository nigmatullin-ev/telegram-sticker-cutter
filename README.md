# Sticker Cutter

A web app for cropping images and exporting 512 × 512 px Telegram stickers.

Images are processed entirely in the browser. They are never uploaded to the server or stored by the app.

The app is fully static and exposes `robots.txt`, `sitemap.xml`, and `llms.txt`. It also includes canonical, social, and Schema.org metadata for search engines and AI agents.

## Run locally

```bash
python3 -m http.server 8000
```

Open http://127.0.0.1:8000.

Opening `index.html` directly also works in most browsers, but a local web server better matches production behavior.
