"""round-check.py <crop.png>...: are a rounded element's corners still rounded?

Each PNG is a screenshot cropped to one element that should have rounded
corners (a flow's `takeScreenshot` with `cropOn`, named `round-*`). Its fill
is the most common colour inside it. A rounded element shows what is behind
it at its corners; a square one shows its fill there. Prints one line per
file and exits 1 when any corner shows the fill.

Reads 8-bit RGB or RGBA PNGs (what simctl and adb screenshots produce) with
the standard library only.
"""
import struct
import sys
import zlib
from collections import Counter

# A corner within this distance of the fill (largest channel difference) counts as the fill.
SAME = 2


def read_png(path):
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('not a PNG')
    pos, idat = 8, b''
    width = height = channels = None
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b'IHDR':
            width, height, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
            if depth != 8 or colour not in (2, 6) or interlace:
                raise ValueError(f'unsupported PNG (depth {depth}, colour type {colour}, interlace {interlace})')
            channels = 3 if colour == 2 else 4
        elif kind == b'IDAT':
            idat += body
        elif kind == b'IEND':
            break
    raw = zlib.decompress(idat)
    stride = width * channels
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(height):
        kind, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            left = line[x - channels] if x >= channels else 0
            up = prev[x]
            corner = prev[x - channels] if x >= channels else 0
            if kind == 1:
                line[x] = (line[x] + left) & 0xFF
            elif kind == 2:
                line[x] = (line[x] + up) & 0xFF
            elif kind == 3:
                line[x] = (line[x] + (left + up) // 2) & 0xFF
            elif kind == 4:
                p = left + up - corner
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - corner)
                line[x] = (line[x] + (left if pa <= pb and pa <= pc else up if pb <= pc else corner)) & 0xFF
        rows.append(line)
        prev = line
    return width, height, [[tuple(row[x * channels:x * channels + 3]) for x in range(width)] for row in rows]


def distance(a, b):
    return max(abs(p - q) for p, q in zip(a, b))


def check(path):
    width, height, pixels = read_png(path)
    if width < 8 or height < 8:
        return False, f'{width}x{height} is too small to judge'
    fill = Counter(pixel for row in pixels for pixel in row).most_common(1)[0][0]
    # One pixel in from each corner: the crop's own edge can catch the anti-aliased border.
    corners = [pixels[1][1], pixels[1][width - 2], pixels[height - 2][1], pixels[height - 2][width - 2]]
    square = [c for c in corners if distance(c, fill) <= SAME]
    hex_ = lambda c: '#%02x%02x%02x' % c
    detail = f'{width}x{height} fill {hex_(fill)} corners {" ".join(hex_(c) for c in corners)}'
    return not square, detail


def main(paths):
    ok = True
    for path in paths:
        try:
            rounded, detail = check(path)
        except Exception as error:  # a crop we can't read is a failed check, not a crash
            rounded, detail = False, f'unreadable: {error}'
        print(f'round: {"PASS" if rounded else "FAIL"} {path} ({detail})')
        ok = ok and rounded
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
