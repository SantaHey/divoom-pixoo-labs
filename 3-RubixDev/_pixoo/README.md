# Pixoo

A Rust crate for interacting with
[Divoom Pixoo](https://divoom.com/products/divoom-pixoo/) devices.

The crate is pretty basic in its functionality and does not support all features
by far, but I think the most important ones are covered.

Tested only on Linux. I have no idea whether this works on Windows or Mac, and
if it doesn't and you need it to, go fix it yourself.

## Examples

Before running any code, make sure you have the Pixoo device paired in your
Bluetooth settings.

More extensive examples can be found in the
[`examples`](https://github.com/RubixDev/pixoo/tree/main/examples) directory.
Run them with:

```bash
cargo run --release --example=<name> <MAC-address>
```

### Displaying an Image

```rust
# use std::str::FromStr;
# use bluetooth_serial_port::BtAddr;
# use pixoo::Pixoo;
// you can either connect to a specific MAC address or try to find the device automatically
//let mut pixoo = Pixoo::find(Duration::from_millis(100)).unwrap();
let mut pixoo = Pixoo::connect(BtAddr::from_str("11:75:58:35:2B:35").unwrap()).unwrap();
let img = image::open("examples/rubix.png").unwrap();
pixoo.set_image(&img).unwrap();
```

### Adjusting the Brightness

```rust
# use std::str::FromStr;
# use bluetooth_serial_port::BtAddr;
# use pixoo::{Pixoo, Brightness};
let mut pixoo = Pixoo::connect(BtAddr::from_str("11:75:58:35:2B:35").unwrap()).unwrap();
pixoo.set_brightness(Brightness::MAX).unwrap();
```

### Display the Time

```rust
# use std::str::FromStr;
# use bluetooth_serial_port::BtAddr;
# use pixoo::{Pixoo, Brightness, mode::{LightMode, TimeFormat, ClockDesign}};
let mut pixoo = Pixoo::connect(BtAddr::from_str("11:75:58:35:2B:35").unwrap()).unwrap();
pixoo.set_brightness(Brightness::new(30).unwrap()).unwrap();
pixoo.set_mode(LightMode::Env {
    time_format: TimeFormat::TwelveHour,
    clock_design: ClockDesign::Digital,
    show_divoom: false,
    show_weather: false,
    show_temp: false,
    show_date: true,
    color: [255, 120, 0],
}).unwrap();
```
