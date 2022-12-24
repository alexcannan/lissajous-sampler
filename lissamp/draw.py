"""
using the python imaging library, draws a lissajous curve on a black background given a set of parameters
"""

from enum import Enum
from pathlib import Path
import subprocess
import tempfile
from typing import Union, Sequence

import math

from PIL import Image, ImageDraw


def draw_lissajous_curve(x_freq: float,
                         y_freq: float,
                         sample_rate: int,
                         n_cycles: int=1,
                         x_phase: float=0,
                         y_phase: float=0,
                         width: int=1000,
                         height: int=1000,
                         ) -> Image:
    """
    draws a lissajous curve on a black background given a set of parameters
    TODO: smoothing/antialiasing
    """
    im = Image.new("RGB", (width, height), "black")
    draw = ImageDraw.Draw(im)
    x_amp = width / 2 * 0.9
    y_amp = height / 2 * 0.9
    for i in range(0, sample_rate+1):
        w = (n_cycles * 2 * math.pi) * i / sample_rate
        x = int(x_amp * math.sin(x_freq * w + x_phase) + width / 2)
        y = int(y_amp * math.sin(y_freq * w + y_phase) + height / 2)
        if i > 0:
            draw.line((x_prev, y_prev, x, y), fill=(255,255,255,128), width=1)
        x_prev = x
        y_prev = y
    return im


def draw_lissajous_curve_svg(x_freq: float,
                             y_freq: float,
                             sample_rate: int,
                             x_phase: float=0,
                             y_phase: float=0,
                             ) -> str:
    """
    draws a lissajous curve as a 100x100 svg element
    """
    x_amp = 48
    y_amp = 48
    width = 100
    height = 100
    lines = []
    x_prev = y_prev = None
    for i in range(0, sample_rate+1):
        w = (2 * math.pi) * i / sample_rate
        x = int(x_amp * math.sin(x_freq * w + x_phase) + width / 2)
        y = int(y_amp * math.sin(y_freq * w + y_phase) + height / 2)
        if i > 0:
            lines.append(f'<line x1="{x_prev}" y1="{y_prev}" x2="{x}" y2="{y}" stroke="white" stroke-width="2" opacity="0.9"/>')
        x_prev = x
        y_prev = y
    svgstring = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" style="background-color:black;">""" + "".join(lines) + """</svg>"""
    return svgstring.replace("\"", "%22")


def draw_lissajous_grid(x_freqs: list[int], y_freqs: list[int], *args, **kwargs) -> Image:
    """
    draws a grid of lissajous curves given a list of x and y frequencies
    """
    im = Image.new("RGB", (len(x_freqs) * 1000, len(y_freqs) * 1000), "black")
    draw = ImageDraw.Draw(im)
    for i in range(len(x_freqs)):
        for j in range(len(y_freqs)):
            im2 = draw_lissajous_curve(x_freqs[i], y_freqs[j], *args, **kwargs)
            im.paste(im2, (i * 1000, j * 1000))
    return im


class LissajousDrawer:
    class AnimationType(Enum):
        X = 1
        XY = 2
        Y = 3

    def __init__(self,
                 x_freq: Union[int, Sequence[int]],
                 y_freq: Union[int, Sequence[int]],
                 sample_rate: int,
                 animate: bool,
                 animation_type: str,
                 animation_speed: float,
                 watermark: bool,
                 ):
        self.animate = animate
        self.animation_type = self.AnimationType[animation_type]
        self.animation_speed = animation_speed
        self.watermark = watermark
        assert type(x_freq) == type(y_freq)
        self.grid = isinstance(x_freq, Sequence)
        self.sample_rate = sample_rate  # TODO: animate this
        self.x_freq = x_freq
        self.y_freq = y_freq

    def draw_frame(self, x_phase: float, y_phase: float) -> Image:
        if self.grid:
            im = draw_lissajous_grid(self.x_freq, self.y_freq, self.sample_rate, x_phase=x_phase, y_phase=y_phase)
        else:
            im = draw_lissajous_curve(self.x_freq, self.y_freq, self.sample_rate, x_phase=x_phase, y_phase=y_phase)
        if self.watermark:
            draw = ImageDraw.Draw(im)
            draw.text((10, 10), f"made with https://lissajous.space/\n{self.x_freq} {self.y_freq} {self.sample_rate}", fill=(255, 255, 255, 128))
        return im

    def draw(self, output: Path):
        if self.animate:
            x_phase, y_phase = 0, 0
            frames = []
            cutoff = 0.5 * math.pi
            with tempfile.TemporaryDirectory() as tmpdir:
                while x_phase <= cutoff and y_phase <= cutoff:
                    im = self.draw_frame(x_phase, y_phase)
                    frame_path = Path(tmpdir).joinpath(f"{len(frames):05d}.png")
                    im.save(frame_path)
                    frames.append(frame_path)
                    print(f"saved {frame_path}")
                    if self.animation_type == self.AnimationType.XY:
                        x_phase += math.radians(self.animation_speed) / math.sqrt(2)
                        y_phase += math.radians(self.animation_speed) / math.sqrt(2)
                    elif self.animation_type == self.AnimationType.X:
                        x_phase += math.radians(self.animation_speed)
                    elif self.animation_type == self.AnimationType.Y:
                        y_phase += math.radians(self.animation_speed)
                subprocess.run(["ffmpeg", "-y", "-framerate", "60", "-i", f"{tmpdir}/%05d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(output)])
        else:
            im = self.draw_frame(0, 0)
            im.save(output)
        return output


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("x_freq", type=int)
    parser.add_argument("y_freq", type=int)
    parser.add_argument("sample_rate", type=int)
    parser.add_argument("output_path", type=Path, help="path to output file, use mp4 for animation and png for still")
    parser.add_argument("--animate", action="store_true", help="enable animation by sweeping phase")
    parser.add_argument("--animation-type", type=str, default="XY", choices=["X", "XY", "Y"], help="type of animation to perform")
    parser.add_argument("--animation-speed", type=float, default=0.1, help="speed of animation (degrees per frame)")
    parser.add_argument("--no-watermark", action="store_true", help="disable watermark")
    args = parser.parse_args()

    drawer = LissajousDrawer(x_freq=args.x_freq,
                             y_freq=args.y_freq,
                             sample_rate=args.sample_rate,
                             animate=args.animate,
                             animation_type=args.animation_type,
                             animation_speed=args.animation_speed,
                             watermark=not args.no_watermark,
                             )
    drawer.draw(args.output_path)