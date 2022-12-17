"""
fastapi router
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, RedirectResponse
from jinja2 import Environment, FileSystemLoader


app = FastAPI()


@app.get("/")
async def root():
    env = Environment(loader=FileSystemLoader(Path(__file__).parent))
    template = env.get_template("lissajous.html")
    return HTMLResponse(template.render())


@app.get("/popular")
async def popular():
    return RedirectResponse("/")


@app.get("/{sharecode}")
async def shared(sharecode: str):
    """
    Sharecodes are hash strings that contain frequency, sample, and color info so people can return to existing visualizations
    """
    return RedirectResponse("/")


if __name__ == '__main__':
    import uvicorn
    uvicorn.run("lissamp.web.router:app", host="0.0.0.0", port=5678, log_level="info")