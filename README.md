# ESP. Actu Lyon : écran TV du coworking et outil interne

Le projet a deux parties, aux couleurs de la charte ESP :
- polices : Oswald, Libre Baskerville, Instrument Sans ;
- couleurs : encre `#0E0E0E`, papier `#FBFAF6`, rouge `#D20014`, jaune `#F0EB1E`, ocre `#B16800`, lavande `#B494DC`.

| | Adresse | Pour qui |
|---|---|---|
| **Écran TV** (`tv/`) | `https://maxime-esdlyon.github.io/esp-actu-lyon/tv/`, ouvert en plein écran sur l'ordinateur relié à la télé | Le coworking (lecture seule) |
| **Outil interne** (`admin/`) | `https://maxime-esdlyon.github.io/esp-actu-lyon/admin/` | Les personnes autorisées, connectées avec leur compte Google |
| **Serveur** (`apps-script/`) | Script Google Apps Script lié au Google Sheet « Actu Lyon – Base éditoriale » | Invisible : il reçoit les actions de l'outil |

```
Outil (GitHub Pages) ── connexion Google ──► jeton d'identité
        │
        └── chaque action + jeton ──► Apps Script (vérifie le jeton et l'accès, agit au nom du ou de la propriétaire)
                                         ├─► Google Sheet : contenus, statuts, commentaires, onglet « Historique »
                                         ├─► Drive « Images Actu Lyon » : photos et vidéos
                                         └─► GitHub : data/content.json, data/flash.json, media/* (bouton ou auto toutes les 10 min)
                                                         │
                                  Écran TV (GitHub Pages) ◄┘  relit les flashs toutes les 30 s, le reste toutes les 5 min
```

Les personnes autorisées n'ont besoin d'aucun accès au Sheet. C'est le script qui écrit, au nom de son ou sa propriétaire. L'écran applique lui-même les dates de publication et d'expiration, ainsi que l'horaire des flashs. Un contenu programmé pour lundi apparaît donc lundi sans nouvelle publication.

## Accès et rôles

| Rôle | Peut |
|---|---|
| **Contributeur·rice** | Proposer des contenus (statut Brouillon ou À traiter), les compléter tant qu'ils sont à ces statuts, envoyer photos et vidéos, commenter, consulter l'historique |
| **Éditeur·rice** | Tout le contenu : statuts, calendrier, éditions, temps forts, Flash Info, suppression, publication |
| **Admin** | En plus : réglages GitHub (dépôt, jeton, publication automatique) et gestion des accès |

Les accès se gèrent dans l'outil (**Diffusion TV → Accès à l'outil**) :
- n'importe quelle adresse Google peut être ajoutée, y compris une adresse Gmail ;
- la personne reçoit aussi l'accès en lecture au dossier des médias, pour voir les vignettes ;
- la personne propriétaire du script est toujours admin.

Accès créés au premier `setup()` : les adresses listées dans `INITIAL_ACCESS` en haut de `Code.gs` (toutes en **admin**), plus la personne propriétaire du script. `apps-script/` reste hors du dépôt public pour ne pas publier ces adresses : on copie ces fichiers directement dans Apps Script.

**Sécurité**
- Le serveur vérifie à chaque appel :
  - que le jeton a bien été signé par Google ;
  - qu'il a été émis pour l'identifiant client de l'outil ;
  - qu'il n'a pas expiré (il dure environ 1 h) ;
  - que l'adresse fait partie des accès.
- Le nom enregistré dans les colonnes « modifié par » et « auteur » vient du compte connecté, pas de la saisie.
- Le jeton GitHub reste dans les propriétés du script et n'est jamais envoyé au navigateur.
- Avoir l'adresse de l'outil ou du script ne suffit pas pour écrire.
- Envois de médias limités à 20 Mo par fichier et à 60 envois par heure et par personne.

**Historique**
- Chaque création, modification ou suppression ajoute une ligne à l'onglet `Historique` : date, personne, état avant et état après.
- Dans la fiche d'un contenu, « Voir les versions » liste ces versions et permet de revenir à l'une d'elles.
- Les contenus supprimés restent lisibles dans cet onglet.

## Arborescence

```
tv/             écran TV (index.html, tv.css, tv.js, config.js = réglages)
admin/          outil interne (index.html) + config.js (adresse du script, identifiant client Google)
apps-script/    serveur : Code.gs, appsscript.json (à copier dans le projet Apps Script du Sheet)
data/           fichiers publiés par l'outil (content.json, flash.json), exemples au départ
media/          photos et vidéos publiées (copiées depuis Drive)
docs/           tutoriel de l'équipe
tools/          serve.rb (serveur local), sync-build.sh
```

## Essayer en local (mode démo)

```bash
ruby tools/serve.rb
```

Ouvrir ensuite :
- `http://localhost:8090/tv/` : l'écran ;
- `http://localhost:8090/admin/` : l'outil.

Tant que `admin/config.js` est vide, l'outil est en **mode démo** :
- les données restent dans le navigateur ;
- « Publier » télécharge `content.json` et `flash.json` ;
- deux onglets ouverts simulent le travail à plusieurs ;
- `?role=contributeur` ou `?role=editeur` montre l'outil avec ce rôle ;
- `?demo=1` force le mode démo même quand l'outil est configuré.

Réglages de l'écran :
- `?date=2026-12-05` simule une date ;
- `←` et `→` changent d'écran ;
- `f` passe en plein écran.

## Mise en place

### 1. GitHub (écran et outil)

1. Créer un dépôt (par ex. `esp-actu-lyon`) et y pousser ce dossier.
2. Activer Pages : *Settings → Pages*, source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Créer un **jeton à accès précis** : *Settings → Developer settings → Fine-grained tokens*.
   - Limité à ce seul dépôt.
   - Permission **Contents : Read and write**.
   - C'est un ou une admin qui le colle dans l'outil (étape 4.2).

> Sur un compte GitHub gratuit, le dépôt Pages est public. Le code et les fichiers affichés à l'écran sont donc visibles de tous. En revanche, rien ne vient du Sheet : ni les notes internes, ni les commentaires, ni l'historique, ni les responsables, ni les temps forts « internes ». Aucun secret n'est dans le dépôt.

### 2. Google Cloud (bouton « Se connecter avec Google »)

1. Sur <https://console.cloud.google.com>, créer un projet (par ex. « ESP Actu Lyon »).
2. Remplir *API et services → Écran de consentement OAuth* :
   - type **Externe** si des adresses hors de l'école doivent entrer, sinon **Interne** ;
   - nom de l'application, adresse de contact ;
   - aucun champ d'application (scope) à ajouter : la connexion ne demande que l'identité.
3. Si le type est Externe, passer l'application **en production**, sinon seules les adresses « de test » pourront se connecter. La connexion seule (e-mail, nom) ne demande pas de validation par Google.
4. Créer l'identifiant : *Identifiants → Créer → ID client OAuth → Application Web*.
   - Origine JavaScript autorisée : `https://maxime-esdlyon.github.io`.
   - Pour tester en local, ajouter aussi `http://localhost:8090`.
5. Copier l'**ID client** (il se termine par `.apps.googleusercontent.com`).

### 3. Apps Script (serveur)

1. Ouvrir le Google Sheet « Actu Lyon – Base éditoriale », puis *Extensions → Apps Script*.
2. Installer le code du serveur :
   - remplacer `Code.gs` par celui de `apps-script/` ;
   - dans *Paramètres du projet*, cocher « Afficher le fichier manifeste », puis remplacer `appsscript.json` ;
   - supprimer l'ancien fichier `Admin` s'il existe ;
   - en haut de `Code.gs`, coller l'ID client dans `GOOGLE_CLIENT_ID`.
3. Exécuter une fois la fonction `setup` et accepter les autorisations. Elle :
   - vérifie les onglets et ajoute les colonnes manquantes ;
   - crée l'onglet `Historique` ;
   - repère le dossier « Images Actu Lyon » ;
   - crée les premiers accès et partage le dossier avec eux.
4. Créer le déploiement : *Déployer → Nouveau déploiement → Application Web*.
   - Exécuter en tant que **moi**.
   - Accès : **Tout le monde**. Ce réglage laisse passer les requêtes de l'outil ; c'est le script qui filtre les personnes.
   - Copier l'URL, qui se termine par `/exec`.

> Si « Tout le monde » n'apparaît pas, l'administration Google de l'école bloque ce type de partage. Il faut le demander au service informatique, ou déployer le script depuis un autre compte.
> Après une modification de `Code.gs`, faire *Gérer les déploiements → Modifier → Nouvelle version* pour garder la même URL.

### 4. Relier l'outil

1. Dans `admin/config.js`, renseigner `apiUrl` (URL `/exec` du script) et `clientId` (ID client Google), puis pousser sur GitHub.
2. Ouvrir `https://maxime-esdlyon.github.io/esp-actu-lyon/admin/`, se connecter, puis aller dans **Diffusion TV → Réglages** :
   - adresse de l'écran ;
   - dépôt `maxime-esdlyon/esp-actu-lyon`, branche, jeton ;
   - cocher « Publication automatique ».
3. Ajouter les autres personnes dans **Accès à l'outil** et leur envoyer l'adresse de l'outil.

### 5. L'ordinateur de la télé

- Ouvrir l'adresse de l'écran dans Chrome, en mode kiosque (`--kiosk`) ou en plein écran (`f`).
- Désactiver la mise en veille.
- La page se recharge seule chaque nuit à 4 h pour prendre en compte les mises à jour.

## Modèle de données

**Onglets lus et écrits.** L'outil travaille sur les onglets existants du Sheet : `Contenus`, `Éditions`, `Commentaires`, `Temps forts`, `Flash`, `Catégories`, `Équipe`, `Historique`.
- Il repère les colonnes par leur nom en ligne 1 : l'ordre peut changer et les colonnes inconnues sont conservées.
- L'onglet `Équipe` (colonnes nom et e-mail) donne le nom affiché ; sinon, c'est le nom du compte Google.
- L'onglet caché `_Médias publiés` mémorise les médias déjà envoyés sur GitHub.

**Ce que publie l'écran** (`data/content.json`) :
- les contenus au statut **Programmé** ou **Publié**, support **TV** ou **NEWS + TV**, non archivés et non expirés ;
- dans l'ordre de l'édition en cours, sinon par priorité ;
- les temps forts marqués « Afficher sur l'écran TV ».

À chaque publication, un contenu « Programmé » dont la date est arrivée passe en « Publié ».

**Écrans générés :**
- info seule, ou 2 à 3 infos groupées ;
- photo plein écran, recadrée ou entière ;
- galerie photos et vidéos avec légendes ;
- agenda de la semaine ;
- temps forts (3 semaines) ;
- horoscope, avec les temps forts de la semaine.

**Flash Info** (`data/flash.json`) : ils passent en priorité. Un nouveau flash interrompt la boucle. Il revient ensuite, jusqu'à sa fin :
- entre chaque écran (Urgent) ;
- tous les 3 écrans (Important) ;
- tous les 5 écrans (Info).

## Développement

La fonction `buildPublic()`, qui construit les fichiers publics, existe en deux exemplaires identiques :
- dans `admin/index.html`, pour l'aperçu et le mode démo ;
- dans `apps-script/Code.gs`, pour la publication.

Après l'avoir modifiée dans `admin/index.html`, lancer :

```bash
./tools/sync-build.sh
```
