#![doc = include_str!("../README.md")]

use std::{
    io::{self, Write},
    time::Duration,
};

use bluetooth_serial_port::{BtAddr, BtError, BtProtocol, BtSocket};
use bounded_integer::BoundedU8;
use image::{imageops::FilterType, DynamicImage, Frame, GenericImageView, Pixel as _};
use itertools::Itertools as _;
use mode::{LightMode, TimeFormat};
use tool::ToolInfo;

pub mod mode;
pub mod tool;

/// The size of the Pixoo display in pixels
pub const DISPLAY_SIZE: u32 = 16;

/// The error type for finding a Pixoo device
#[derive(Debug, thiserror::Error)]
pub enum PixooFindError {
    /// No device matching the criteria was found
    #[error("no device named 'Pixoo' found")]
    NotFound,

    /// A Bluetooth connection error
    #[error(transparent)]
    Bluetooth(#[from] BtError),
}

pub type Brightness = BoundedU8<0, 100>;

/// A connection to a Pixoo device
///
/// For examples, view the crate documentation.
///
/// - To establish a new connection, see [`Self::connect`] or [`Self::find`].
/// - To re-establish an interrupted connection, see [`Self::reconnect`].
/// - To communicate with the connected device, see the various `set_` methods.
///
/// ## References
/// - [official (?) docs](http://docin.divoom-gz.com/web/#/5/146)
/// - [Python pixoo client](https://github.com/virtualabs/pixoo-client)
/// - [pixelramen](https://github.com/jfroehlich/node-p1x3lramen)
/// - some manual Bluetooth snooping with the help of adb and wireshark
pub struct Pixoo {
    sock: BtSocket,
    address: BtAddr,
    filter_type: FilterType,
}

impl Pixoo {
    /// Connect to a Divoom Pixoo device at the given [`BtAddr`]
    ///
    /// To automatically connect to an available device called "Pixoo", use [`Self::find`].
    pub fn connect(address: BtAddr) -> Result<Self, BtError> {
        let mut sock = BtSocket::new(BtProtocol::RFCOMM)?;
        sock.connect(address)?;
        Ok(Self {
            sock,
            address,
            filter_type: FilterType::Gaussian,
        })
    }

    /// Find and connect to a Divoom Pixoo
    ///
    /// Assumes the device's name is exactly "Pixoo". For other predicates search through
    /// [`bluetooth_serial_port::scan_devices`] yourself and connect with [`Self::connect`].
    pub fn find(timeout: Duration) -> Result<Self, PixooFindError> {
        let devices = bluetooth_serial_port::scan_devices(timeout)?;
        let pixoo = devices
            .into_iter()
            .find(|dev| dev.name == "Pixoo")
            .ok_or(PixooFindError::NotFound)?;
        Self::connect(pixoo.addr).map_err(PixooFindError::from)
    }

    /// Tries to reconnect the device
    ///
    /// This can be used if the connection got interrupted.
    pub fn reconnect(&mut self) -> Result<(), BtError> {
        self.sock = BtSocket::new(BtProtocol::RFCOMM)?;
        self.sock.connect(self.address)
    }

    /// Sets a different [`FilterType`] to use for all resize operations
    ///
    /// When not manually set, defaults to [`FilterType::Gaussian`].
    pub fn with_filter_type(self, filter_type: FilterType) -> Self {
        Self {
            filter_type,
            ..self
        }
    }

    fn send(&mut self, cmd: u8, args: &[u8]) -> io::Result<()> {
        self.sock.write_all(&Self::encode_cmd(cmd, args))
    }

    fn encode_cmd(cmd: u8, args: &[u8]) -> Vec<u8> {
        let payload_size = args.len() + 3;
        let mut buf = vec![1, payload_size as u8, (payload_size >> 8) as u8, cmd];
        buf.extend_from_slice(args);
        let checksum = buf[1..].iter().map(|n| *n as u16).sum::<u16>();
        buf.extend_from_slice(&checksum.to_le_bytes());
        buf.push(2);
        buf
    }

    fn encode_raw_img(&self, img: &DynamicImage) -> (usize, Vec<u8>, Vec<u8>) {
        let img = img.resize_exact(DISPLAY_SIZE, DISPLAY_SIZE, self.filter_type);

        let mut pixels = [0; (DISPLAY_SIZE * DISPLAY_SIZE) as usize];
        let mut palette = vec![];
        for (x, y, col) in img.pixels() {
            let col = col.to_rgb();
            let idx = palette.iter().position(|c| c == &col).unwrap_or_else(|| {
                palette.push(col);
                palette.len() - 1
            });
            pixels[x as usize + 16 * y as usize] = idx;
        }

        let mut bitwidth = 1;
        while 1 << bitwidth < palette.len() {
            bitwidth += 1;
        }

        let encoded_palette = palette
            .iter()
            .flat_map(|color| color.to_rgb().0)
            .collect_vec();
        let encoded_pixels = pixels
            .iter()
            .flat_map(|i| (0..bitwidth).map(move |bit| i >> bit & 1))
            .chunks(8)
            .into_iter()
            .map(|bits| {
                bits.enumerate()
                    .fold(0, |acc, (idx, bit)| acc | ((bit as u8) << idx))
            })
            .collect_vec();

        (palette.len(), encoded_palette, encoded_pixels)
    }

    fn encode_animation(&self, frames: impl Iterator<Item = DynamicImage>, speed: u16) -> Vec<u8> {
        let mut encoded_frames = vec![];
        let mut timecode = 0;
        for frame in frames {
            let (num_colors, palette, pixel_data) = self.encode_raw_img(&frame);
            let frame_size = 7 + pixel_data.len() + palette.len();
            encoded_frames.extend_from_slice(&[
                0xaa,
                frame_size as u8,
                (frame_size >> 8) as u8,
                timecode as u8,
                (timecode >> 8) as u8,
                0,
                num_colors as u8,
            ]);
            encoded_frames.extend_from_slice(&palette);
            encoded_frames.extend_from_slice(&pixel_data);
            timecode += speed;
        }

        encoded_frames
    }

    /// Sets the brightness level of the pixoo
    pub fn set_brightness(&mut self, brightness: Brightness) -> io::Result<()> {
        self.send(0x74, &[brightness.into()])
    }

    // TODO: docs and experimentation
    pub fn set_time_format(&mut self, format: TimeFormat) -> io::Result<()> {
        self.send(0x2c, &[format as u8])
    }

    // TODO: docs and experimentation
    pub fn set_mode(&mut self, mode: LightMode) -> io::Result<()> {
        self.send(0x45, &mode.encode())
    }

    // TODO: docs and experimentation
    pub fn set_tool_info(&mut self, info: ToolInfo) -> io::Result<()> {
        self.send(0x72, &info.encode())
    }

    /// Displays a single color on all pixels
    ///
    /// This function takes three separate RGB params. See also [`Self::set_color_tuple`] and
    /// [`Self::set_color_array`].
    pub fn set_color(&mut self, red: u8, green: u8, blue: u8) -> io::Result<()> {
        self.send(0x6f, &[red, green, blue])
    }

    /// Displays a single color on all pixels
    ///
    /// This function takes a single RGB tuple. See also [`Self::set_color`] and
    /// [`Self::set_color_array`].
    pub fn set_color_tuple(&mut self, (red, green, blue): (u8, u8, u8)) -> io::Result<()> {
        self.send(0x6f, &[red, green, blue])
    }

    /// Displays a single color on all pixels
    ///
    /// This function takes a single RGB array. See also [`Self::set_color`] and
    /// [`Self::set_color_tuple`].
    pub fn set_color_array(&mut self, [red, green, blue]: [u8; 3]) -> io::Result<()> {
        self.send(0x6f, &[red, green, blue])
    }

    /// Resizes and sends a [`DynamicImage`] to the device to display
    ///
    /// By default, the given image is resized to exactly 16x16 pixels using
    /// the filter type set by [`Self::with_filter_type`] and not preserving aspect ratio.
    /// If you wish to handle resizing differently, do so yourself and pass a 16x16 pixels image to
    /// this function.
    pub fn set_image(&mut self, image: &DynamicImage) -> io::Result<()> {
        let (num_colors, palette, pixel_data) = self.encode_raw_img(image);
        let frame_size = 7 + pixel_data.len() + palette.len();
        let mut buf = vec![
            0x00,
            0x0a,
            0x0a,
            0x04,
            0xaa,
            frame_size as u8,
            (frame_size >> 8) as u8,
            0,
            0,
            0,
            num_colors as u8,
        ];
        buf.extend_from_slice(&palette);
        buf.extend_from_slice(&pixel_data);
        self.send(0x44, &buf)
    }

    /// Sends and displays a small animation on the device
    pub fn set_animation(
        &mut self,
        frames: impl Iterator<Item = DynamicImage>,
        speed: u16,
    ) -> io::Result<()> {
        let frames = self.encode_animation(frames, speed);
        let total_size = frames.len();
        for (i, chunk) in frames.chunks(200).enumerate() {
            let mut buf = vec![total_size as u8, (total_size >> 8) as u8, i as u8];
            buf.extend_from_slice(chunk);
            self.send(0x49, &buf)?;
        }
        Ok(())
    }

    /// Sends and displays a small animation on the device
    ///
    /// Other than [`Self::set_animation`], this method takes a list of [`Frame`]s as is for
    /// example obtained when reading a GIF file with `image`'s
    /// [`GifDecoder`](image::codecs::gif::GifDecoder).
    #[inline]
    pub fn set_frames(&mut self, frames: Vec<Frame>, speed: u16) -> io::Result<()> {
        self.set_animation(frames.into_iter().map(|f| f.into_buffer().into()), speed)
    }
}
