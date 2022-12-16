"""
using the python imaging library, draws a lissajous curve on a black background given a set of parameters
"""

import math

from PIL import Image, ImageDraw, ImageTk


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
            draw.line((x_prev, y_prev, x, y), fill="white", width=3)
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


if __name__ == "__main__":
    # im = draw_lissajous_grid(list(range(1,6)), list(range(10,15)), 50)
    # im.resize((6000, 6000)).show()
    svg = draw_lissajous_curve_svg(11,13,50)
    print(svg)