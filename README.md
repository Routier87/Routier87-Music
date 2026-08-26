# Routier 87 Music Hub V9 — Full Sync

Cette version ne dépend ni de Supabase ni de Firebase.

## Architecture

- `index.html` : site statique à publier sur GitHub Pages.
- `server.js` : petit serveur Node.js + WebSocket.
- `data/state.json` : base de données JSON persistante.
- `data/files/` : fichiers audio et pochettes.

GitHub Pages est un hébergement statique : il publie HTML/CSS/JavaScript depuis le dépôt. Il ne peut donc pas héberger directement le serveur WebSocket. Le serveur V9 doit être lancé séparément sur un hébergeur Node.js ou une machine toujours allumée.

## Installation du serveur

```bash
npm install
npm start
```

Le serveur écoute sur le port `8080` (ou la variable d'environnement `PORT`).

## Mise en ligne

1. Mets `index.html` dans ton dépôt GitHub Pages.
2. Déploie `server.js`, `package.json` et le dossier `data/` sur un hébergeur Node.js.
3. Obtiens une adresse HTTPS/WSS, par exemple `wss://sync.ton-domaine.fr`.
4. Dans le site, ouvre `☁️ Connexion` et renseigne cette adresse.
5. Tous les appareils connectés au même serveur voient les changements en direct.

## Important

Cette V9 est une base fonctionnelle sans fournisseur de base de données tiers. Avant une utilisation publique, il faut ajouter une vraie authentification côté serveur, des droits d'accès, une limite de taille/quotas et idéalement un stockage objet/CDN pour les gros fichiers audio.

Ne mets jamais un mot de passe serveur ou un token d'administration dans `index.html`.
