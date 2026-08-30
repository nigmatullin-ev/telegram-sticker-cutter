from __future__ import annotations

import os

from flask import Flask, render_template

app = Flask(__name__)
@app.get("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
