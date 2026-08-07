use std::{env, fs::File, io::BufReader, str::FromStr as _, time::Duration};

use anyhow::{Context as _, Result};
use bluetooth_serial_port::BtAddr;
use image::{codecs::gif::GifDecoder, imageops::FilterType, AnimationDecoder};
use pixoo::{Brightness, Pixoo, PixooFindError};

fn main() -> Result<()> {
    let mac_address = env::args().nth(1).and_then(|s| BtAddr::from_str(&s).ok());
    let mut pixoo = match mac_address {
        Some(addr) => Pixoo::connect(addr).map_err(PixooFindError::from),
        None => Pixoo::find(Duration::from_millis(100)),
    }
    .context("connecting to pixoo")?
    .with_filter_type(FilterType::Nearest);
    pixoo
        .set_brightness(Brightness::new(30).unwrap())
        .context("setting brightness")?;

    let gif = GifDecoder::new(BufReader::new(
        File::open("examples/fish.gif").context("reading gif file")?,
    ))
    .context("creating gif decoder")?
    .into_frames()
    .collect_frames()
    .context("decoding gif")?;
    pixoo.set_frames(gif, 10).context("setting animation")?;

    Ok(())
}
