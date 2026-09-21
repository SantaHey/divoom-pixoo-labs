use bounded_integer::BoundedU8;

use crate::Brightness;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TimeFormat {
    TwelveHour = 0,
    TwentyfourHour = 1,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ClockDesign {
    Digital = 0,
    DigitalRainbow = 1,
    DigitalBox = 2,
    Analog1 = 3,
    DigitalInverted = 4,
    Analog2 = 5,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LightEffectMode {
    Normal = 0,
    Rainbow = 1,
    Plants = 2,
    Fly = 3,
    Sleep = 4,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MusicMode {
    BottomBars = 0,
    CenterBars = 2,
    SideBars = 6,
    Face1 = 1,
    Face2 = 3,
    Face3 = 7,
    FrogFace = 5,
    Matrix = 4,
    FallingBlocks = 8,
    Fireworks = 10,
    DancingBoy = 9,
    DancingGirl = 11,
    Custom(BoundedU8<12, 255>),
}

impl MusicMode {
    fn encode(&self) -> u8 {
        match *self {
            Self::Custom(num) => num.into(),
            // SAFETY: Because `Self` is marked `repr(u8)`, its layout is a `repr(C)` `union`
            // between `repr(C)` structs, each of which has the `u8` discriminant as its first
            // field, so we can read the discriminant without offsetting the pointer.
            _ => unsafe { *<*const _>::from(self).cast::<u8>() },
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LightMode {
    Env {
        time_format: TimeFormat,
        clock_design: ClockDesign,
        show_divoom: bool,
        show_weather: bool,
        show_temp: bool,
        show_date: bool,
        color: [u8; 3],
    },
    Light {
        color: [u8; 3],
        brightness: Brightness,
        effect_mode: LightEffectMode,
        on: bool,
    },
    Divoom,
    Special {
        mode: u8,
    },
    Music {
        mode: MusicMode,
    },
    User,
    Score {
        red_score: u8,
        blue_score: u8,
    },
}

impl LightMode {
    pub(crate) fn encode(&self) -> Vec<u8> {
        match *self {
            LightMode::Env {
                time_format,
                clock_design,
                show_divoom,
                show_weather,
                show_temp,
                show_date,
                color,
            } => vec![
                0,
                time_format as u8,
                clock_design as u8,
                show_divoom as u8,
                show_weather as u8,
                show_temp as u8,
                show_date as u8,
                color[0],
                color[1],
                color[2],
            ],
            LightMode::Light {
                color,
                brightness,
                effect_mode,
                on,
            } => vec![
                1,
                color[0],
                color[1],
                color[2],
                brightness.into(),
                effect_mode as u8,
                on as u8,
            ],
            LightMode::Divoom => vec![2],
            LightMode::Special { mode } => vec![3, mode],
            LightMode::Music { mode } => vec![4, mode.encode()],
            LightMode::User => vec![5],
            LightMode::Score {
                red_score,
                blue_score,
            } => vec![6, 0, red_score, 0, blue_score],
        }
    }
}
