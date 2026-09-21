use bounded_integer::BoundedU8;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TimerControl {
    Pause = 0,
    Start = 1,
    Reset = 2,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum NoiseControl {
    Start = 1,
    Stop = 2,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CountDownControl {
    Start = 0,
    Cancel = 1,
    PlayPause = 2,
}

pub type Seconds = BoundedU8<0, 59>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ToolInfo {
    Timer(TimerControl),
    Score {
        on: bool,
        red_score: u16,
        blue_score: u16,
    },
    Noise(NoiseControl),
    CountDown {
        control: CountDownControl,
        minutes: u8,
        seconds: Seconds,
    },
}

impl ToolInfo {
    pub(crate) fn encode(&self) -> Vec<u8> {
        match *self {
            ToolInfo::Timer(timer_control) => vec![0, timer_control as u8],
            ToolInfo::Score {
                on,
                red_score,
                blue_score,
            } => vec![
                1,
                on as u8,
                red_score as u8,
                (red_score >> 8) as u8,
                blue_score as u8,
                (blue_score >> 8) as u8,
            ],
            ToolInfo::Noise(noise_control) => vec![2, noise_control as u8],
            ToolInfo::CountDown {
                control,
                minutes,
                seconds,
            } => vec![3, control as u8, minutes, seconds.into()],
        }
    }
}
