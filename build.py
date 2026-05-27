#!/usr/bin/env python3
"""
Build standalone static HTML for Cloudflare static hosting.

The source HTML uses Jinja-style `{% include 'file' %}` to inline its JS and
CSS. There's no dynamic templating beyond that, so we resolve the includes
here and emit fully self-contained index.html files. No uvicorn/FastAPI needed.

Outputs:
  dist/index.html      <- lissamp/web/    (regular)
  dist/3d/index.html   <- lissamp/web3d/  (3D)
"""

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"

# (source dir, output path relative to dist)
TARGETS = [
    (ROOT / "lissamp" / "web", "index.html"),
    (ROOT / "lissamp" / "web3d", "3d/index.html"),
]

INCLUDE_RE = re.compile(r"{%\s*include\s*['\"](?P<name>[^'\"]+)['\"]\s*%}")


def render(src_dir: Path) -> str:
    html = (src_dir / "lissajous.html").read_text()

    def replace(match: re.Match) -> str:
        included = (src_dir / match.group("name")).read_text()
        # Strip a trailing newline so the inlined block stays tidy.
        return included.rstrip("\n")

    return INCLUDE_RE.sub(replace, html)


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    for src_dir, out_rel in TARGETS:
        out_path = DIST / out_rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(render(src_dir))
        print(f"built {out_path.relative_to(ROOT)}  ({out_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
