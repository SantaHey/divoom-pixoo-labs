import debug from "debug";

const CONNECT_ATTEMPTS = 3;
const CONNECT_ATTEMPTS_DELAY = 500;

const log = debug("pixoo-soup");

let bluetoothSerialPort;
async function loadBluetoothSerialPort() {
  if (!bluetoothSerialPort) {
    try {
      bluetoothSerialPort = (await import("bluetooth-serial-port")).default;
    } catch (error) {
      throw new Error(
        "Module natif 'bluetooth-serial-port' indisponible (binaire non compilé). " +
        "Sur Raspberry Pi : installez les dépendances système puis lancez 'pnpm rebuild bluetooth-serial-port'."
      );
    }
  }
  return bluetoothSerialPort;
}

export async function probeConnection(address, timeoutMs = 4000) {
  const bluetoothSerialPort = await loadBluetoothSerialPort();
  const btSerial = new bluetoothSerialPort.BluetoothSerialPort();
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Délai de connexion dépassé (timeout).")), timeoutMs)
  );

  const channel = await Promise.race([findSerialPortChannel(btSerial, address), timeout]);
  await connectBluetooth(btSerial, address, channel);
  btSerial.close();

  return { ok: true, address };
}

export async function connect(address, { timeoutMs = 6000 } = {}) {
  const bluetoothSerialPort = await loadBluetoothSerialPort();
  const btSerial = new bluetoothSerialPort.BluetoothSerialPort();

  const attemptStart = Date.now();
  for (let i=0;i<CONNECT_ATTEMPTS;i++) {
    const remaining = timeoutMs - (Date.now() - attemptStart);
    if (remaining <= 0) break;

    try {
      log(`Connecting to ${address}...`);

      const channel = await withTimeout(findSerialPortChannel(btSerial, address), remaining, "Parcours du canal RFCOMM (timeout).");
      await withTimeout(connectBluetooth(btSerial, address, channel), remaining, "Ouverture du port série Bluetooth (timeout).");

      log(`Connected to ${address}`);

      return {
        async write(buffer) {
          return withTimeout(
            new Promise((resolve, reject) => btSerial.write(buffer, (err, responseBuffer) => (err ? reject(err) : resolve(responseBuffer)))),
            2000,
            "Pixoo ne répond pas au write (timeout)."
          );
        },
    
        close() {
          btSerial.close();
        }    
      };
    } catch (err) {
      log(`Failed to connect with err ${err}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, CONNECT_ATTEMPTS_DELAY));
    }
  }

  throw new Error(`Failed to connect to device address ${address}`);
}

function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), Math.max(milliseconds, 1))),
  ]);
}

function findSerialPortChannel(btSerial, address) {
  return new Promise((resolve, reject) => btSerial.findSerialPortChannel(address, (channel) => resolve(channel), err => reject(err)));
}

function connectBluetooth(btSerial, address, channel) {
  return new Promise((resolve, reject) => btSerial.connect(address, channel,  () => {
    resolve({ btSerial, address, channel });
  }, err => reject(err)));
}

