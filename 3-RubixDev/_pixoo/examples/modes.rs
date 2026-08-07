use std::{env, str::FromStr as _, thread, time::Duration};

use anyhow::{Context as _, Result};
use bluetooth_serial_port::BtAddr;
use pixoo::{
    mode::{ClockDesign, LightEffectMode, LightMode, MusicMode, TimeFormat},
    Brightness, Pixoo, PixooFindError,
};

fn main() -> Result<()> {
    let mac_address = env::args().nth(1).and_then(|s| BtAddr::from_str(&s).ok());
    let mut pixoo = match mac_address {
        Some(addr) => Pixoo::connect(addr).map_err(PixooFindError::from),
        None => Pixoo::find(Duration::from_millis(100)),
    }
    .context("connecting to pixoo")?;
    pixoo.set_brightness(Brightness::new(30).unwrap()).context("setting brightness")?;

    println!("Setting divoom mode");
    pixoo.set_mode(LightMode::Divoom)?;
    thread::sleep(Duration::from_secs(5));

    println!("Setting user mode");
    pixoo.set_mode(LightMode::User)?;
    thread::sleep(Duration::from_secs(5));

    println!("Setting light mode");
    pixoo.set_mode(LightMode::Light {
        color: [255, 0, 255],
        brightness: Brightness::MAX,
        effect_mode: LightEffectMode::Normal,
        on: true,
    })?;
    thread::sleep(Duration::from_secs(1));
    pixoo.set_mode(LightMode::Light {
        color: [255, 0, 255],
        brightness: Brightness::new(30).unwrap(),
        effect_mode: LightEffectMode::Normal,
        on: false,
    })?;
    thread::sleep(Duration::from_secs(1));
    pixoo.set_mode(LightMode::Light {
        color: [255, 0, 255],
        brightness: Brightness::new(50).unwrap(),
        effect_mode: LightEffectMode::Normal,
        on: true,
    })?;
    thread::sleep(Duration::from_secs(1));
    pixoo.set_mode(LightMode::Light {
        color: [255, 0, 255],
        brightness: Brightness::new(30).unwrap(),
        effect_mode: LightEffectMode::Rainbow,
        on: true,
    })?;
    thread::sleep(Duration::from_secs(5));

    // TODO: what is special mode?
    println!("Setting special mode 0");
    pixoo.set_mode(LightMode::Special { mode: 0 })?;
    thread::sleep(Duration::from_secs(5));

    println!("Setting music mode");
    pixoo.set_mode(LightMode::Music { mode: MusicMode::SideBars })?;
    thread::sleep(Duration::from_secs(5));

    println!("Setting score mode");
    pixoo.set_mode(LightMode::Score {
        red_score: 10,
        blue_score: 1,
    })?;
    thread::sleep(Duration::from_secs(4));
    // TODO: this still isn't really working?
    pixoo.set_mode(LightMode::Score {
        red_score: 42,
        blue_score: 69,
    })?;
    thread::sleep(Duration::from_secs(1));

    println!("Setting env mode");
    pixoo.set_mode(LightMode::Env {
        // TODO: fully ignored? even in 0x2c command?
        time_format: TimeFormat::TwelveHour,
        clock_design: ClockDesign::Digital,
        // TODO: not working?
        show_divoom: false,
        show_weather: true,
        show_temp: true,
        show_date: true,
        color: [255, 0, 255],
    })?;

    Ok(())
}
