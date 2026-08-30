# Sticker Cutter

A web app for cropping images and exporting 512 × 512 px Telegram stickers.

Images are processed entirely in the browser. They are never uploaded to the server or stored by the app.

The app exposes `robots.txt`, `sitemap.xml`, and `llms.txt`, and includes canonical, social, and Schema.org metadata for search engines and AI agents.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000.
