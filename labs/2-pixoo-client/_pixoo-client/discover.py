#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "bleak"
# ]
# ///

# uv run .\discover.py

import asyncio
from bleak import BleakScanner

TARGET_HINTS = ["pixoo", "pixo", "pixel", "divoom"]

def match(name: str | None) -> bool:
    if not name:
        return False
    n = name.lower()
    return any(h in n for h in TARGET_HINTS)

async def main():
    devices = await BleakScanner.discover(timeout=10.0)

    found = []
    for d in devices:
        # BLEDevice a généralement: d.name et d.address
        if match(getattr(d, "name", None)):
            found.append(d)

    if not found:
        print("Aucun appareil Pixoo-like trouvé. Essaie de changer TARGET_HINTS.")
        print("Appareils vus (nom -> adresse) :")
        for d in devices:
            print(f"- {getattr(d, 'name', None)} -> {d.address}")
        return

    print("Appareils trouvés :")
    for d in found:
        print(f"- name={getattr(d, 'name', None)} address={d.address}")

if __name__ == "__main__":
    asyncio.run(main())
