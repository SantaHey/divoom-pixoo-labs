# Pixoo Drawer

Un éditeur de pixels envoie exactement les mêmes données vers un écran simulé
ou vers le vrai Pixoo en Bluetooth. Le projet est basé sur le `demo2.js`
fonctionnel du lab `4-pixoo-soup`.

## Les trois services

| Service | URL | Rôle |
| --- | --- | --- |
| Site web | http://localhost:3010 | Dessiner sur une grille 16 × 16 |
| Simulateur | http://localhost:3011 | Afficher en direct les images reçues |
| Bluetooth | http://localhost:3012/display | Envoyer les images au vrai Pixoo |

Le simulateur et la passerelle Bluetooth exposent le même endpoint :
`POST /display`. Le site peut donc changer de cible sans transformer les
données.

## Installation

Node.js 18 est recommandé, car c'est la version utilisée par le lab qui
fonctionne.

```sh
cd src/pixoo-drawer
pnpm install
```

## Configuration Bluetooth

Ouvrez `config.local.json` et renseignez une seule fois l'adresse du Pixoo :

```json
{
  "pixooAddress": "11:75:58:C1:62:D0",
  "readyDelayMs": 900,
  "frameDelayMs": 20
}
```

Ce fichier est ignoré par Git. `config.example.json` reste disponible comme
modèle pour une nouvelle installation.

L'adresse peut rester vide tant que vous utilisez uniquement le simulateur.

## Tout lancer

Une seule commande démarre les trois services :

```sh
npm run dev
```

Ouvrez ensuite :

1. http://localhost:3010 pour dessiner ;
2. http://localhost:3011 pour voir le résultat simulé.

Dans l'éditeur, choisissez « Simulateur » ou « Pixoo Bluetooth ». Les dessins
sont envoyés automatiquement pendant le tracé. Le bouton « Envoyer maintenant »
permet de forcer un envoi.

## Temps réel multi-utilisateur

L'éditeur conserve une image partagée côté serveur. Chaque navigateur reçoit
l'image actuelle en se connectant, puis les modifications sont poussées en temps
réel vers tous les autres navigateurs ouverts. L'image est aussi enregistrée
localement dans `data/current-display.json` (ignoré par Git), afin de survivre
au redémarrage du service. En cas de modifications exactement simultanées, la
dernière image reçue par le serveur devient la version partagée.

`Ctrl+C` arrête les trois services.

### Mode en ligne avec Cloudflared

Pour rendre l'éditeur accessible sur Internet, sans exposer directement le
simulateur ni la passerelle Bluetooth :

```sh
pnpm run dev -- --online
```

Ce mode lance le tunnel nommé de ton compte Cloudflare avec le token chargé
depuis `.env.local`. Le navigateur ne parle qu'au backend de l'éditeur ; c'est
ce backend qui relaie les images vers le simulateur et le Pixoo en local.
Les ports du simulateur et du Bluetooth restent donc uniquement accessibles
sur la machine qui exécute les services.

Prérequis : la commande `cloudflared` doit être installée, le tunnel de ton
compte doit publier `pixel.turiste.ch` vers le port web local, et
`.env.local` doit contenir `CLOUDFLARED_TUNNEL_TOKEN`.

Le mode `--online` refuse de démarrer si le token manque, afin de ne jamais
basculer silencieusement sur un Quick Tunnel `trycloudflare.com`.

### Ports personnalisés

Par défaut : web **3010**, simulateur **3011**, bluetooth **3012** (modifiables dans
`config.js`). Pour les changer juste pour un lancement, passez-les en arguments :

```sh
pnpm run dev -- 3020 3021 3022
```

Ordre : web, simulateur, bluetooth. Variante avec noms :

```sh
pnpm run dev -- --web 3020 --simulator 3021 --bluetooth 3022
```

## Accès depuis un autre appareil

Les serveurs écoutent sur le réseau local. Une personne connectée au même
réseau peut ouvrir `http://IP-DE-CET-ORDINATEUR:3010` et dessiner. Le navigateur
parle au serveur web, qui relaie ensuite le dessin localement au simulateur ou
au Bluetooth : aucune configuration n'est nécessaire sur le téléphone ou le
second ordinateur.

Le pare-feu Windows peut demander l'autorisation d'accès réseau au premier
lancement.

## Lancer un service seul

```sh
npm run web
npm run simulator
npm run bluetooth
```

## Raspberry Pi

La passerelle Bluetooth repose sur le module natif `bluetooth-serial-port`,
compilé localement avec `node-gyp`. Sur un Raspberry Pi (ARM), ce binaire doit
être compilé **sur le Pi lui-même** : sans cela, tout service qui charge le
module échoue avec :

```
Error: Could not locate the bindings file. Tried: …/build/Release/BluetoothSerialPort.node
```

### Prérequis système (une seule fois)

```sh
sudo apt-get install -y build-essential python3 libbluetooth-dev
```

### Recompiler le module natif

```sh
cd "$(realpath node_modules/bluetooth-serial-port)"
pnpm exec node-gyp rebuild --release
```

Cette compilation directe est nécessaire avec pnpm 12, qui peut ignorer le
script natif du paquet installé depuis Git. Elle génère
`build/Release/BluetoothSerialPort.node` pour l'architecture du Raspberry
(`linux/arm64`). À relancer après un changement de version de Node.js.

Vérifier que Node peut charger le binaire :

```sh
cd ~/dev/divoom-pixoo-labs/src/pixoo-drawer
node -e "import('bluetooth-serial-port').then(() => console.log('IMPORT OK')).catch(console.error)"
```

### Simulateur seul : rien à faire

Le site web et le simulateur n'utilisent pas le module natif. Si vous n'envoyez
que vers le simulateur, `npm run dev` fonctionne immédiatement, sans build.
L'erreur Bluetooth n'apparaît qu'au moment d'envoyer vers le vrai Pixoo, et
sans faire planter les autres services.

## Format échangé

Chaque image utilise ce format :

```json
{
  "colors": ["000000", "ff0000"],
  "pixels": [0, 1, 0]
}
```

`colors` contient les couleurs hexadécimales sans `#`. `pixels` contient
exactement 256 nombres ; chaque nombre est l'index d'une couleur de la palette.

## Premier envoi Bluetooth

L'ancien prototype devait parfois envoyer l'image deux fois. La cause probable
est une trame envoyée juste après l'ouverture du canal RFCOMM, avant que le
Pixoo soit prêt. La passerelle :

- conserve une seule connexion Bluetooth ;
- attend 900 ms après sa création ;
- sérialise les images pour éviter leur chevauchement ;
- attend 20 ms entre les paquets d'une image.

Les délais peuvent être ajustés dans `config.local.json`. Ils seront à confirmer
sur le vrai appareil ; le serveur n'envoie volontairement pas chaque image deux
fois.

## Exemple terminal historique

`main.js` reste l'exemple interactif directement issu du `demo2.js` validé :

```sh
npm run example -- 11:75:58:C1:62:D0
```

Flèches : déplacer le curseur. Espace : dessiner. Touches 1 à 4 : choisir une
couleur. `C` : effacer. `Ctrl+C` : quitter.
