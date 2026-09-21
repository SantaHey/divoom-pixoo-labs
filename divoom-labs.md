# Liens

Divoom beginner : https://divoom.com/blogs/app-guide/pixoo-64-api-beginner-guide
    - Local HTTP API
    - Community Tools
Pixoo REST : https://github.com/4ch1m/pixoo-rest
Divoom .NET : https://github.com/panoramicdata/Divoom.Api
Timebox : https://doc.divoom-gz.com/web/#/12?page_id=486
Pixoo-MCP : https://github.com/cyanheads/pixoo-mcp-server

-- PYTHON
Pixoo Python (lib d'origine) : https://github.com/SomethingWithComputers/pixoo
Pixoo-ng (fork maintenu) : https://github.com/kongo09/pixoo-ng
Pixoo-next (support Pixoo 16 / Times Gate) : https://github.com/TheSecondLugia/pixoo-next

-- Pixoo Client
https://github.com/virtualabs/pixoo-client

# 1-pixoo-next

https://github.com/TheSecondLugia/pixoo-next

```sh
uv venv --python 3.11 C:\Users\jeannico.thurre\labs\_kernel-uv
```

```sh
mkdir C:\Users\jeannico.thurre\labs\divoom\1-pixoo-next
cd C:\Users\jeannico.thurre\labs\divoom\labs\1-pixoo-next
git clone https://github.com/TheSecondLugia/pixoo-next _pixoo-next
cd _pixoo-next
C:\Users\jeannico.thurre\labs\_kernel-uv\Scripts\activate.ps1
uv pip install -e .
```

```sh
# run example
uv run --active .\examples\pixoorest\main.py
```

# 2-pixoo-client

```sh
cd C:\Users\jeannico.thurre\labs\divoom\labs\2-pixoo-client
git clone https://github.com/virtualabs/pixoo-client _pixoo-client
C:\Users\jeannico.thurre\labs\_kernel-uv\Scripts\activate.ps1
cd .\_pixoo-client\
uv pip install -r requirements.txt
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom\labs\2-pixoo-client
cd .\_pixoo-client\

C:\Users\jeannico.thurre\labs\_kernel-uv\Scripts\activate.ps1

uv run pixoo.py 11:75:58:C1:62:D0 frame.png
```

# 3-RubixDev

```sh
mkdir C:\Users\jeannico.thurre\labs\divoom\labs\3-RubixDev
cd C:\Users\jeannico.thurre\labs\divoom\labs\3-RubixDev
git clone https://github.com/RubixDev/pixoo _pixoo
cd _pixoo
```

```sh
# install rust (Windows)
winget install -e --id Rustlang.Rustup
```

```sh
# run example
cargo run --release --example=image 11:75:58:C1:62:D0
```
 
# 4-pixoo-soup

install pré-requis
```sh
# install nodejs (Windows)
winget install -e --id OpenJS.NodeJS
# install nvm
winget install -e --id OpenJS.NodeJS.LTS
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom\labs
git clone https://github.com/saintedlama/pixoo-soup 4-pixoo-soup
cd 4-pixoo-soup
# IMPORTANT
nvm use 18
npm install
```

```sh
cd C:\Users\jeannico.thurre\labs\divoom\labs\4-pixoo-soup\_pixoo-soup
node demo.js 11:75:58:C1:62:D0
```


# src/pixoo-drawer

```sh
cd D:\OneDrive\Projets\developpement\web\divoom\_divoom\_main\src\pixoo-drawer\

pnpm install --store-dir=D:/HorsLigne/dev/pnpm/_modules_store

pnpm add --save-dev node-gyp --store-dir=D:/HorsLigne/dev/pnpm/_modules_store
```

run pour le raspberry
```sh
cd ~/dev/divoom-pixoo-labs/src/pixoo-drawer

# 1. installer les dépendances
pnpm install

# 2. recompiler le module natif bluetooth (nécessite build-essential python3 libbluetooth-dev)
pnpm run rebuild

# 3. tout lancer (ports par défaut : web 3010, simulateur 3011, bluetooth 3012)
pnpm run dev

# ports personnalisés : pnpm run dev -- <web> <simulateur> <bluetooth>
pnpm run dev -- 3020 3021 3022
```

connexion bluetooth manuelle avant de lancer (adresse : 11:75:58:C1:62:D0)
```sh
# 1. allumer l'adaptateur bluetooth
bluetoothctl power on

# 2. connexion manuelle directe au Pixoo
bluetoothctl connect 11:75:58:C1:62:D0
# ou test brut du lien RFCOMM :
sudo rfcomm connect hci0 11:75:58:C1:62:D0   # Ctrl+C pour couper
```

dépannage
```sh
# lancer uniquement la passerelle bluetooth (port 3012)
pnpm run bluetooth

# listes/scan des appareils visibles
bluetoothctl devices
hcitool scan

# si erreur de permission bluetooth
sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))
```

- Éditeur : http://IP-DU-PI:3010
- Simulateur : http://IP-DU-PI:3011

# For online

Le mode online expose uniquement l'éditeur. Le backend relaie ensuite vers le
simulateur et le Bluetooth en local ; les ports `3021` et `3022` ne sont jamais
exposés.

## Installation unique

Créer dans Cloudflare un API Token avec **Cloudflare Tunnel: Edit** et
**DNS: Edit**, puis récupérer l'Account ID.

Créer une seule fois `src/pixoo-drawer/.env.local` :

```dotenv
CLOUDFLARE_API_TOKEN=<API_TOKEN>
CLOUDFLARE_ACCOUNT_ID=<ACCOUNT_ID>
```

Le fichier est ignoré par Git et chargé automatiquement par `online:setup`.
Tu ne réécris donc plus jamais ces variables.

```sh
pnpm run online:setup
```

Le script crée ou réutilise `pixoo-editor`, configure `pixel.turiste.ch` vers
le port web, crée le DNS et ajoute automatiquement
`CLOUDFLARED_TUNNEL_TOKEN` dans `.env.local`. Si la zone n'est pas détectée, ajouter
`CLOUDFLARE_ZONE_ID=<ZONE_ID>` dans `.env.local`.

## Lancement

```sh
pnpm run dev -- --online 3020 3021 3022
```

Le runner charge automatiquement `CLOUDFLARED_TUNNEL_TOKEN` depuis
`.env.local`. Tu peux copier ce fichier sur le Raspberry de manière sécurisée
ou le gérer avec Bitwarden/1Password ; ne jamais le committer dans Git.

URL publique : https://pixel.turiste.ch

`Ctrl+C` arrête l'éditeur, le simulateur, le Bluetooth et Cloudflared.
