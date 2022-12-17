"""
this module is meant to be shared

original idea: encode parameters in base64
new idea: generate random b64 string and see if it is taken
"""

import base64
import math


# TODO: let people share to twitter


def count_possibilities():
    x_freqs = 300
    y_freqs = 300
    samples = 5000
    colors = 16**6
    total_possibilities = x_freqs * y_freqs * samples * colors
    print(f"total possibilities: {total_possibilities:,d}")
    chars = 0
    while 64**chars < total_possibilities:
        chars += 1
    print(f"need {chars} characters of base64 to represent possibilities")


if __name__ == "__main__":
    sc = ShareCode.from_parameters(10, 24, 1097, "#ffffff")
    count_possibilities()