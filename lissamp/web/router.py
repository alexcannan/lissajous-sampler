"""
fastapi router
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader


app = FastAPI()


@app.get("/")
async def root():
    env = Environment(loader=FileSystemLoader(Path(__file__).parent))
    template = env.get_template("lissajous.html")
    return HTMLResponse(template.render())


if __name__ == '__main__':
    import uvicorn
    uvicorn.run("lissamp.web.router:app", host="0.0.0.0", port=5678, log_level="info")