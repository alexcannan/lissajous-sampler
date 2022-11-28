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
            draw.line((x_prev, y_prev, x, y), fill="white")
        x_prev = x
        y_prev = y
    return im


if __name__ == "__main__":
    im = draw_lissajous_curve(2, 13, 10000, n_cycles=3)
    im.show()