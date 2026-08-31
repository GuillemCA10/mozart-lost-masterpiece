from flask import Flask

app = Flask(__name__)


@app.route("/")
def index():
    return "<h1>Mozart's Lost Masterpiece</h1><p>Skeleton is alive.</p>"