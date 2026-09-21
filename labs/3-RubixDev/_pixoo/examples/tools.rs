use std::{env, str::FromStr as _, thread, time::Duration};

use anyhow::{Context as _, Result};
use bluetooth_serial_port::BtAddr;
use pixoo::{
    tool::{CountDownControl, NoiseControl, Seconds, TimerControl, ToolInfo},
    Brightness, Pixoo, PixooFindError,
};

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

    println!("starting timer");
    pixoo.set_tool_info(ToolInfo::Timer(TimerControl::Start))?;
    thread::sleep(Duration::from_secs(5));
    println!("pausing timer");
    pixoo.set_tool_info(ToolInfo::Timer(TimerControl::Pause))?;
    thread::sleep(Duration::from_secs(2));
    println!("resuming timer");
    pixoo.set_tool_info(ToolInfo::Timer(TimerControl::Start))?;
    thread::sleep(Duration::from_secs(2));
    println!("resetting timer");
    pixoo.set_tool_info(ToolInfo::Timer(TimerControl::Reset))?;
    thread::sleep(Duration::from_secs(1));

    println!("setting score to 10:20");
    pixoo.set_tool_info(ToolInfo::Score {
        on: true,
        red_score: 10,
        blue_score: 20,
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("setting score to 100:20");
    pixoo.set_tool_info(ToolInfo::Score {
        on: true,
        red_score: 100,
        blue_score: 20,
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("setting score to 999:20");
    pixoo.set_tool_info(ToolInfo::Score {
        on: true,
        red_score: 999,
        blue_score: 20,
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("setting score to 999:1000");
    pixoo.set_tool_info(ToolInfo::Score {
        on: true,
        red_score: 999,
        blue_score: 1000,
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("setting score to 999:1001");
    pixoo.set_tool_info(ToolInfo::Score {
        on: true,
        red_score: 999,
        blue_score: 1001,
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("exit score");
    // TODO: does the on boolean do anything?
    pixoo.set_tool_info(ToolInfo::Score {
        on: false,
        red_score: 20,
        blue_score: 10,
    })?;
    thread::sleep(Duration::from_secs(2));

    println!("starting noise mode");
    pixoo.set_tool_info(ToolInfo::Noise(NoiseControl::Start))?;
    thread::sleep(Duration::from_secs(5));
    println!("stopping noise mode");
    pixoo.set_tool_info(ToolInfo::Noise(NoiseControl::Stop))?;
    thread::sleep(Duration::from_secs(2));

    // TODO this doesn't work as expected
    println!("starting countdown from 10 seconds");
    pixoo.set_tool_info(ToolInfo::CountDown {
        control: CountDownControl::Start,
        minutes: 0,
        seconds: Seconds::new(10).unwrap(),
    })?;
    thread::sleep(Duration::from_secs(5));
    println!("pausing countdown");
    pixoo.set_tool_info(ToolInfo::CountDown {
        control: CountDownControl::PlayPause,
        minutes: 0,
        seconds: Seconds::new(10).unwrap(),
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("resuming countdown");
    pixoo.set_tool_info(ToolInfo::CountDown {
        control: CountDownControl::PlayPause,
        minutes: 0,
        seconds: Seconds::new(10).unwrap(),
    })?;
    thread::sleep(Duration::from_secs(2));
    println!("stopping countdown");
    pixoo.set_tool_info(ToolInfo::CountDown {
        control: CountDownControl::Cancel,
        minutes: 0,
        seconds: Seconds::new(10).unwrap(),
    })?;
    thread::sleep(Duration::from_secs(2));

    Ok(())
}
