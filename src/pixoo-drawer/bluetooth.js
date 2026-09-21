import debug from "debug";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const CONNECT_ATTEMPTS = 3;
const CONNECT_ATTEMPTS_DELAY = 500;

const log = debug("pixoo-soup");
const execFileAsync = promisify(execFile);

export class BluetoothDisabledError extends Error {
  constructor() {
    super("Bluetooth est désactivé sur cet ordinateur.");
    this.name = "BluetoothDisabledError";
  }
}

/**
 * Vérifie l'état de l'adaptateur Bluetooth sous Windows.
 * Sur les autres plateformes, bluetooth-serial-port reste la source de vérité.
 */
export async function isBluetoothEnabled() {
  if (process.platform !== "win32") return true;

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", [
        "Add-Type -AssemblyName System.Runtime.WindowsRuntime",
        "$radio = [Windows.Devices.Radios.Radio,Windows.Devices.Radios,ContentType=WindowsRuntime]",
        "$operation = $radio::GetRadiosAsync()",
        "$method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1",
        "$resultType = [System.Collections.Generic.IReadOnlyList``1].MakeGenericType($radio)",
        "$task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))",
        "$task.Wait()",
        "$bluetooth = $task.Result | Where-Object Kind -eq 'Bluetooth' | Select-Object -First 1",
        "if ($null -eq $bluetooth) { 'Missing' } else { $bluetooth.State.ToString() }",
      ].join("; ")],
      { timeout: 2500, windowsHide: true },
    );
    return stdout.trim().toLowerCase() === "on";
  } catch (error) {
    log(`Unable to determine Bluetooth radio state: ${error}`);
    // Si WinRT est indisponible sur une ancienne version de Windows, laisser
    // la bibliothèque native produire son erreur habituelle.
    return true;
  }
}

async function ensureBluetoothEnabled() {
  if (!(await isBluetoothEnabled())) throw new BluetoothDisabledError();
}

function normalizeError(error, fallback) {
  if (error instanceof Error) return error;
  if (error?.message) return new Error(error.message);
  return new Error(error ? String(error) : fallback);
}

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
  await ensureBluetoothEnabled();
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
  await ensureBluetoothEnabled();
  const bluetoothSerialPort = await loadBluetoothSerialPort();
  const btSerial = new bluetoothSerialPort.BluetoothSerialPort();

  const attemptStart = Date.now();
  for (let i=0;i<CONNECT_ATTEMPTS;i++) {
    const remaining = timeoutMs - (Date.now() - attemptStart);
    if (remaining <= 0) break;

    try {
      await ensureBluetoothEnabled();
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
  return new Promise((resolve, reject) => btSerial.findSerialPortChannel(
    address,
    (channel) => resolve(channel),
    (err) => reject(normalizeError(err, `Impossible de trouver le canal Bluetooth pour ${address}.`)),
  ));
}

function connectBluetooth(btSerial, address, channel) {
  return new Promise((resolve, reject) => btSerial.connect(
    address,
    channel,
    () => resolve({ btSerial, address, channel }),
    (err) => reject(normalizeError(err, `Impossible d'ouvrir le port Bluetooth pour ${address}.`)),
  ));
}

