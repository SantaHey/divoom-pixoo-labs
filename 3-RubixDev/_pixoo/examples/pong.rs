use std::{env, str::FromStr as _, thread, time::Duration};

use anyhow::{Context, Result};
use bluetooth_serial_port::BtAddr;
use glam::{ivec2, IVec2};
use image::{DynamicImage, Rgb, RgbImage};
use pixoo::{Brightness, Pixoo, PixooFindError};

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

    loop {
        if let Err(err) = pellets(&mut pixoo) {
            eprintln!("{err:?}");
            pixoo.reconnect()?;
        }
    }
}

struct Pellet {
    pos: IVec2,
    vel: IVec2,
    color: Rgb<u8>,
}

fn pellets(pixoo: &mut Pixoo) -> Result<()> {
    let mut pellets = [
        Pellet {
            pos: ivec2(0, 3),
            vel: ivec2(1, 1),
            color: Rgb([0xff, 0x00, 0xff]),
        },
        Pellet {
            pos: ivec2(2, 7),
            vel: ivec2(1, -1),
            color: Rgb([0xff, 0xaa, 0x00]),
        },
        Pellet {
            pos: ivec2(1, 14),
            vel: ivec2(2, -1),
            color: Rgb([0x66, 0xff, 0x66]),
        },
        Pellet {
            pos: ivec2(0, 0),
            vel: ivec2(1, 0),
            color: Rgb([0xcc, 0x00, 0x00]),
        },
        Pellet {
            pos: ivec2(15, 0),
            vel: ivec2(0, 1),
            color: Rgb([0xcc, 0x00, 0x00]),
        },
        Pellet {
            pos: ivec2(15, 15),
            vel: ivec2(-1, 0),
            color: Rgb([0xcc, 0x00, 0x00]),
        },
        Pellet {
            pos: ivec2(0, 15),
            vel: ivec2(0, -1),
            color: Rgb([0xcc, 0x00, 0x00]),
        },
    ];
    loop {
        let mut img = RgbImage::new(16, 16);
        for pellet in &mut pellets {
            img.put_pixel(pellet.pos.x as u32, pellet.pos.y as u32, pellet.color);
            if (pellet.pos + pellet.vel).x < 0 || (pellet.pos + pellet.vel).x >= 16 {
                pellet.vel.x = -pellet.vel.x;
            }
            if (pellet.pos + pellet.vel).y < 0 || (pellet.pos + pellet.vel).y >= 16 {
                pellet.vel.y = -pellet.vel.y;
            }
            pellet.pos += pellet.vel;
        }
        pixoo
            .set_image(&DynamicImage::from(img))
            .context("setting image")?;
        thread::sleep(Duration::from_millis(100));
    }
}
