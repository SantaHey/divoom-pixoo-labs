use std::{env, fs::File, io::BufReader, str::FromStr as _, thread, time::Duration};

use anyhow::{Context as _, Result};
use bluetooth_serial_port::BtAddr;
use image::{codecs::gif::GifDecoder, imageops::FilterType, AnimationDecoder, DynamicImage};
use itertools::Itertools;
use pixoo::{Brightness, Pixoo, PixooFindError, DISPLAY_SIZE};

fn main() -> Result<()> {
    let mac_address = env::args().nth(1).and_then(|s| BtAddr::from_str(&s).ok());
    let mut pixoo = match mac_address {
        Some(addr) => Pixoo::connect(addr).map_err(PixooFindError::from),
        None => Pixoo::find(Duration::from_millis(100)),
    }
    .context("connecting to pixoo")?;
    pixoo
        .set_brightness(Brightness::new(30).unwrap())
        .context("setting brightness")?;

    let gif = GifDecoder::new(BufReader::new(
        File::open("examples/pedro.gif").context("reading gif file")?,
    ))
    .context("creating gif decoder")?
    .into_frames()
    .collect_frames()
    .context("decoding gif")?;

    // pedro.gif is too long/complicated to be fully rendered by the pixoo itself, so this is a way
    // we can send the animation live frame by frame.
    let gif = gif
        .into_iter()
        .map(|frame| {
            DynamicImage::from(frame.into_buffer()).resize_exact(
                DISPLAY_SIZE,
                DISPLAY_SIZE,
                FilterType::Gaussian,
            )
        })
        .collect_vec();
    let mut i = 0;
    loop {
        pixoo.set_image(&gif[i]).context("setting frame")?;
        thread::sleep(Duration::from_millis(100));
        i += 1;
        i %= gif.len();
    }
}
