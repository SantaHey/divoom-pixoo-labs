# Pixoo Drawer

Un éditeur de pixels envoie exactement les mêmes données vers un écran simulé
ou vers le vrai Pixoo en Bluetooth. Le projet est basé sur le `demo2.js`
fonctionnel du lab `4-pixoo-soup`.

## Les trois services

| Service | URL | Rôle |
| --- | --- | --- |
| Site web | http://localhost:3000 | Dessiner sur une grille 16 × 16 |
| Simulateur | http://localhost:3001 | Afficher en direct les images reçues |
| Bluetooth | http://localhost:3002/display | Envoyer les images au vrai Pixoo |

Le simulateur et la passerelle Bluetooth exposent le même endpoint :
`POST /display`. Le site peut donc changer de cible sans transformer les
données.

## Installation

Node.js 18 est recommandé, car c'est la version utilisée par le lab qui
fonctionne.

```sh
cd src/pixoo-drawer
npm install
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

1. http://localhost:3000 pour dessiner ;
2. http://localhost:3001 pour voir le résultat simulé.

Dans l'éditeur, choisissez « Simulateur » ou « Pixoo Bluetooth ». Les dessins
sont envoyés automatiquement pendant le tracé. Le bouton « Envoyer maintenant »
permet de forcer un envoi.

`Ctrl+C` arrête les trois services.

## Accès depuis un autre appareil

Les serveurs écoutent sur le réseau local. Une personne connectée au même
réseau peut ouvrir `http://IP-DE-CET-ORDINATEUR:3000` et dessiner. Le navigateur
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
