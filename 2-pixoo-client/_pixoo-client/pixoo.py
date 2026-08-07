"""
Pixoo
"""

import sys
import socket
from time import sleep
from PIL import Image
from math import log10, ceil


class Pixoo(object):
    CMD_SET_SYSTEM_BRIGHTNESS = 0x74
    CMD_SPP_SET_USER_GIF = 0xb1
    CMD_DRAWING_ENCODE_PIC = 0x5b

    BOX_MODE_CLOCK = 0
    BOX_MODE_TEMP = 1
    BOX_MODE_COLOR = 2
    BOX_MODE_SPECIAL = 3

    instance = None

    def __init__(self, mac_address):
        self.mac_address = mac_address
        self.btsock = None

    @staticmethod
    def get():
        if Pixoo.instance is None:
            Pixoo.instance = Pixoo(Pixoo.BDADDR)
            Pixoo.instance.connect()
        return Pixoo.instance

    def connect(self):
        """Connect to SPP."""
        self.btsock = socket.socket(
            socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM
        )
        self.btsock.connect((self.mac_address, 1))

    def __spp_frame_checksum(self, args):
        """Compute frame checksum."""
        return sum(args[1:]) & 0xFFFF

    def __spp_frame_encode(self, cmd, args):
        """Encode frame for given command and arguments (list)."""
        payload_size = len(args) + 3

        frame_header = [1, payload_size & 0xFF, (payload_size >> 8) & 0xFF, cmd]
        frame_buffer = frame_header + args
        cs = self.__spp_frame_checksum(frame_buffer)
        frame_suffix = [cs & 0xFF, (cs >> 8) & 0xFF, 2]
        return frame_buffer + frame_suffix

    def send(self, cmd, args):
        """Send data to SPP."""
        spp_frame = self.__spp_frame_encode(cmd, args)
        if self.btsock is not None:
            self.btsock.send(bytes(spp_frame))

    def set_system_brightness(self, brightness):
        """Set system brightness."""
        self.send(Pixoo.CMD_SET_SYSTEM_BRIGHTNESS, [brightness & 0xFF])

    def set_box_mode(self, boxmode, visual=0, mode=0):
        """Set box mode."""
        self.send(0x45, [boxmode & 0xFF, visual & 0xFF, mode & 0xFF])

    def set_color(self, r, g, b):
        """Set color."""
        self.send(0x6F, [r & 0xFF, g & 0xFF, b & 0xFF])

    def encode_image(self, filepath):
        img = Image.open(filepath).convert("RGB")  # IMPORTANT: force RGB
        return self.encode_raw_image(img)

    def encode_raw_image(self, img):
        """
        Encode a 16x16 image.
        img must be in RGB mode so getpixel returns (r,g,b).
        """
        w, h = img.size
        if w != h:
            print("[!] Image must be square.")
            return None

        # resize if too big
        if w > 16:
            img = img.resize((16, 16))

        palette = []
        pixels = []

        for y in range(16):
            for x in range(16):
                r, g, b = img.getpixel((x, y))  # always tuple in RGB mode

                if (r, g, b) not in palette:
                    palette.append((r, g, b))
                    idx = len(palette) - 1
                else:
                    idx = palette.index((r, g, b))

                pixels.append(idx)

        # encode pixels
        bitwidth = ceil(log10(len(palette)) / log10(2)) if len(palette) > 1 else 1
        nbytes = ceil((256 * bitwidth) / 8.0)

        # pack indices into a bitstream (little-endian in your previous logic via string)
        encoded_pixels = []
        encoded_byte = ""
        for i in pixels:
            encoded_byte = bin(i)[2:].rjust(bitwidth, "0") + encoded_byte
            if len(encoded_byte) >= 8:
                encoded_pixels.append(encoded_byte[-8:])
                encoded_byte = encoded_byte[:-8]

        # convert binary strings to integers
        encoded_data = [int(c, 2) for c in encoded_pixels]

        # encode palette
        encoded_palette = []
        for r, g, b in palette:
            encoded_palette += [r, g, b]

        return (len(palette), encoded_palette, encoded_data)

    def draw_gif(self, filepath, speed=100):
        """Parse Gif file and draw as animation."""
        frames = []
        timecode = 0
        anim_gif = Image.open(filepath)

        for n in range(anim_gif.n_frames):
            anim_gif.seek(n)
            frame_img = anim_gif.convert("RGB")
            nb_colors, palette, pixel_data = self.encode_raw_image(frame_img)

            frame_size = 7 + len(pixel_data) + len(palette)
            frame_header = [
                0xAA,
                frame_size & 0xFF,
                (frame_size >> 8) & 0xFF,
                timecode & 0xFF,
                (timecode >> 8) & 0xFF,
                0,
                nb_colors,
            ]
            frame = frame_header + palette + pixel_data
            frames += frame

            timecode += speed

        nchunks = ceil(len(frames) / 200.0)
        total_size = len(frames)

        for i in range(nchunks):
            chunk = [total_size & 0xFF, (total_size >> 8) & 0xFF, i]
            self.send(0x49, chunk + frames[i * 200 : (i + 1) * 200])

    def draw_anim(self, filepaths, speed=100):
        timecode = 0

        frames = []
        for filepath in filepaths:
            nb_colors, palette, pixel_data = self.encode_image(filepath)

            frame_size = 7 + len(pixel_data) + len(palette)
            frame_header = [
                0xAA,
                frame_size & 0xFF,
                (frame_size >> 8) & 0xFF,
                timecode & 0xFF,
                (timecode >> 8) & 0xFF,
                0,
                nb_colors,
            ]
            frame = frame_header + palette + pixel_data
            frames += frame

            timecode += speed

        nchunks = ceil(len(frames) / 200.0)
        total_size = len(frames)

        for i in range(nchunks):
            chunk = [total_size & 0xFF, (total_size >> 8) & 0xFF, i]
            self.send(0x49, chunk + frames[i * 200 : (i + 1) * 200])

    def draw_pic(self, filepath):
        """Draw encoded picture."""
        nb_colors, palette, pixel_data = self.encode_image(filepath)
        frame_size = 7 + len(pixel_data) + len(palette)
        frame_header = [0xAA, frame_size & 0xFF, (frame_size >> 8) & 0xFF, 0, 0, 0, nb_colors]
        frame = frame_header + palette + pixel_data
        prefix = [0x0, 0x0A, 0x0A, 0x04]
        self.send(0x44, prefix + frame)


class PixooMax(Pixoo):
    """
    PixooMax class, derives from Pixoo but does not support animation yet.
    """

    def __init__(self, mac_address):
        super().__init__(mac_address)

    def draw_pic(self, filepath):
        """Draw encoded picture."""
        nb_colors, palette, pixel_data = self.encode_image(filepath)
        frame_size = 8 + len(pixel_data) + len(palette)
        frame_header = [
            0xAA,
            frame_size & 0xFF,
            (frame_size >> 8) & 0xFF,
            0,
            0,
            3,
            nb_colors & 0xFF,
            (nb_colors >> 8) & 0xFF,
        ]
        frame = frame_header + palette + pixel_data
        prefix = [0x0, 0x0A, 0x0A, 0x04]
        self.send(0x44, prefix + frame)

    def draw_gif(self, filepath, speed=100):
        raise "NotYetImplemented"

    def draw_anim(self, filepaths, speed=100):
        raise "NotYetImplemented"

    def encode_image(self, filepath):
        img = Image.open(filepath).convert("RGB")  # IMPORTANT: force RGB
        return self.encode_raw_image(img)

    def encode_raw_image(self, img):
        """
        Encode a 32x32 image.
        img must be in RGB mode so getpixel returns (r,g,b).
        """
        w, h = img.size
        if w != h:
            print("[!] Image must be square.")
            return None

        if w > 32:
            img = img.resize((32, 32))

        palette = []
        pixels = []

        for y in range(32):
            for x in range(32):
                r, g, b = img.getpixel((x, y))  # always tuple in RGB mode

                if (r, g, b) not in palette:
                    palette.append((r, g, b))
                    idx = len(palette) - 1
                else:
                    idx = palette.index((r, g, b))

                pixels.append(idx)

        bitwidth = ceil(log10(len(palette)) / log10(2)) if len(palette) > 1 else 1

        encoded_pixels = []
        encoded_byte = ""

        # Create our pixels bitstream
        for i in pixels:
            encoded_byte = bin(i)[2:].rjust(bitwidth, "0") + encoded_byte

        # Encode pixel data
        while len(encoded_byte) >= 8:
            encoded_pixels.append(encoded_byte[-8:])
            encoded_byte = encoded_byte[:-8]

        # If some bits left, pack and encode
        if len(encoded_byte) > 0:
            padding = 8 - len(encoded_byte)
            _ = padding
            encoded_pixels.append(encoded_byte.rjust(bitwidth, "0"))

        encoded_data = [int(c, 2) for c in encoded_pixels]

        encoded_palette = []
        for r, g, b in palette:
            encoded_palette += [r, g, b]

        return (len(palette), encoded_palette, encoded_data)


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        pixoo_baddr = sys.argv[1]  # ex: 11:75:58:C1:62:D0

        import os

        frames_dir = r"C:\Users\jeannico.thurre\labs\divoom\2-pixoo-client\_pixoo-client\frames"
        filepaths = sorted([frames_dir + "\\" + f for f in os.listdir(frames_dir)])
        filepaths = [p for p in filepaths if p.lower().endswith((".png", ".jpg", ".jpeg", ".gif"))]

        pixoo = Pixoo(pixoo_baddr)
        pixoo.connect()

        sleep(1)
        pixoo.draw_anim(filepaths)
    else:
        print("Usage: %s <Pixoo BT address>" % sys.argv[0])
