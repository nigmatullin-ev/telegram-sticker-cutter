from __future__ import annotations

import io
import os
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_file
from PIL import Image, ImageOps, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parent
MAX_UPLOAD = 20 * 1024 * 1024
MAX_STICKER = 512 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

app = Flask(__name__)
app.config.update(MAX_CONTENT_LENGTH=MAX_UPLOAD)


def error(message: str, status: int = 400):
    return jsonify({"error": message}), status


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/sticker")
def make_sticker():
    uploaded = request.files.get("image")
    if not uploaded or not uploaded.filename:
        return error("Choose an image.")

    try:
        source = Image.open(uploaded.stream)
        if source.format not in ALLOWED_FORMATS:
            return error("JPG, PNG, and WebP are supported.")
        source = ImageOps.exif_transpose(source)
        source.load()
    except (UnidentifiedImageError, OSError, ValueError):
        return error("The image could not be read.")

    try:
        x = float(request.form["x"])
        y = float(request.form["y"])
        size = float(request.form["size"])
    except (KeyError, TypeError, ValueError):
        return error("Invalid crop parameters.")

    width, height = source.size
    if size <= 0 or x < 0 or y < 0 or x + size > width + 0.5 or y + size > height + 0.5:
        return error("The crop area extends beyond the image boundaries.")

    box = (
        max(0, round(x)),
        max(0, round(y)),
        min(width, round(x + size)),
        min(height, round(y + size)),
    )
    sticker = source.crop(box).convert("RGBA")
    sticker = ImageOps.fit(sticker, (512, 512), Image.Resampling.LANCZOS)

    output_format = request.form.get("format", "webp").lower()
    buffer = io.BytesIO()
    if output_format == "png":
        sticker.save(buffer, "PNG", optimize=True)
        if buffer.tell() > MAX_STICKER:
            for colors in (256, 192, 128, 96, 64):
                buffer.seek(0)
                buffer.truncate()
                reduced = sticker.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
                reduced.save(buffer, "PNG", optimize=True)
                if buffer.tell() <= MAX_STICKER:
                    break
        mimetype, extension = "image/png", "png"
    else:
        # Use the highest WebP quality that fits Telegram's 512 KB static-sticker limit.
        for quality in (92, 86, 80, 74, 68, 60, 52, 44):
            buffer.seek(0)
            buffer.truncate()
            sticker.save(buffer, "WEBP", quality=quality, method=6)
            if buffer.tell() <= MAX_STICKER:
                break
        mimetype, extension = "image/webp", "webp"

    buffer.seek(0)
    return send_file(
        buffer,
        mimetype=mimetype,
        as_attachment=True,
        download_name=f"telegram-sticker.{extension}",
    )


@app.errorhandler(413)
def too_large(_error):
    return error("The file is too large. The maximum size is 20 MB.", 413)


if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5000")), debug=True)
