# ESP. Actu Lyon — Tutoriel de l'équipe

*Version « Claude Code » : outil et écran publiés sur GitHub, données rangées dans le Google Drive de l'école.*

## 1. Ouvrir l'outil

1. Ouvre `https://maxime-esdlyon.github.io/esp-actu-lyon/admin/`. L'adresse exacte t'est envoyée par un·e admin.
2. Clique sur **Se connecter avec Google** et choisis le compte qu'on t'a autorisé.
3. Ton nom et ton rôle s'affichent en haut à droite. C'est ce nom qui signe tes modifications et tes commentaires.

Pour savoir où en sont tes modifications, regarde la barre grise : un point vert veut dire « enregistré dans le Drive ». La connexion dure environ une heure. Ensuite, une fenêtre te demande de te reconnecter et ta saisie en cours est conservée.

Si l'outil t'affiche « n'a pas accès », c'est que ton adresse n'est pas encore autorisée : demande à un·e admin de l'ajouter.

### Les rôles

| Rôle | Ce que tu peux faire |
|---|---|
| **Contributeur·rice** | Proposer des contenus (Brouillon ou À traiter), ajouter photos, vidéos et galerie, commenter. Quand l'équipe a pris en charge un contenu, tu peux le consulter et le commenter, mais plus le modifier. |
| **Éditeur·rice** | Tout le contenu : statuts, calendrier, éditions, temps forts, Flash Info, publication |
| **Admin** | En plus : réglages de publication et accès (Diffusion TV → Accès à l'outil) |

Plusieurs personnes peuvent travailler en même temps. L'outil vérifie toutes les 40 secondes si un·e collègue a modifié quelque chose et se met à jour. Si deux personnes modifient le même contenu, la seconde est prévenue et choisit : recharger la version de l'autre, ou écraser avec la sienne.

## 2. Les rubriques

| Rubrique | À quoi elle sert |
|---|---|
| **Accueil** | Compteurs par statut, contenus à relire, propositions de la veille, mini-aperçu de l'écran, temps forts |
| **Contenus** | Vue **Colonnes** (glisser une carte pour changer son statut) ou **Liste** (recherche et filtres) |
| **Calendrier** | Le mois semaine par semaine : glisser un contenu sur un jour le programme (l'expiration suit) ; « À placer » = contenus sans date |
| **Temps forts** | Jurys, partiels, événements ; « Afficher sur l'écran TV » oui/non |
| **Éditions** | Ordre de passage de la semaine, glisser-déposer |
| **Flash Info** | Messages prioritaires, immédiats ou programmés |
| **Diffusion TV** | Aperçu exact de l'écran (avec date simulée), publication, réglages |

## 3. Le circuit d'un contenu

Brouillon → À traiter → Sélectionné → En préparation → À valider → **Programmé** → **Publié**

Seuls les contenus **Programmé** ou **Publié** passent à l'écran, entre leur date de publication et leur date d'expiration. Un contenu « Programmé » passe seul en « Publié » le jour venu.

## 4. Remplir la fiche d'un contenu

- **Titre** court (70 caractères conseillés) et **accroche** d'une phrase : c'est ce qui s'affiche, lu de loin.
- **Catégorie**, **priorité**, **support** (NEWS, TV, NEWS + TV), **responsable**.
- **Programmation** : publication, expiration (toujours en mettre une pour un événement), date de l'événement (alimente l'agenda de la semaine).
- **Écran TV**
  - *Format* : Auto (seule si priorité haute, sinon groupée par 2 ou 3), Info seule, Groupée, Photo plein écran.
  - *Filtre coloré ESP* : oui (photo teintée à la couleur de la catégorie) ou non (photo d'origine).
  - *Cadrage* : recadrée (remplit le cadre) ou photo entière (non coupée, fond flou autour).
  - *Photo principale* : réduite automatiquement à 1600 px, rangée dans Drive. Sans photo, une illustration est générée.
- **QR code & lien** : colle le lien (événement, projet, inscription), choisis « Oui » et un texte court sous le QR code.
- **Galerie** : ajoute photos et vidéos (MP4/WebM, 20 Mo max., sans le son), avec une légende chacune (projet, nom, promo). Elles défilent : 5 s par photo, une vidéo jusqu'à sa fin. Ordre réglable avec ▲▼.
- **Notes internes** et **commentaires** : jamais affichés à l'écran.
- **Aperçu TV** : montre le contenu tel qu'il apparaîtra, sans le publier.

Archiver retire un contenu de l'écran en le gardant ; Supprimer est définitif.

**Historique** : en bas de la fiche, « Voir les versions » liste chaque enregistrement. Pour chacun, tu vois qui l'a fait, quand, et ce qui a changé. « Revenir à cette version » restaure une version ancienne ; la version actuelle reste dans l'historique. Tout est aussi conservé dans l'onglet « Historique » du Google Sheet, y compris les contenus supprimés.

## 5. Horoscope

Catégorie Horoscope, une ligne par signe dans la description : `Bélier : texte`. Il faut au moins six signes. Il s'affiche avec les temps forts de la semaine.

## 6. Flash Info

1. Flash Info → **+ Nouveau flash** : titre (40 caractères), message (160 caractères).
2. Niveau : **Urgent** (revient entre chaque écran), **Important** (tous les 3), **Info** (tous les 5). Le plus urgent passe en premier.
3. Durée à chaque passage, puis départ : **Immédiat**, **Programmé** (début et fin) ou **Brouillon**.
4. L'écran relit les flashs toutes les 30 secondes : compte jusqu'à une minute.
5. **Arrêter** retire le flash tout de suite ; **Diffuser maintenant** le relance.

## 7. Publier

- **Automatique** : toutes les 10 minutes, si quelque chose a changé.
- **Manuel** : bouton « Publier sur l'écran » (Accueil ou Diffusion TV).
- L'écran se met à jour sous 5 minutes. La barre grise indique la dernière publication.

## 8. En cas de problème

| Symptôme | Que faire |
|---|---|
| Point rouge « Dernière modification non enregistrée » | Lis le message : ton rôle ne permet peut-être pas cette action. Sinon, vérifie ta connexion internet et refais la modification |
| « Le compte … n'a pas accès » | Demande à un·e admin de t'ajouter, ou reconnecte-toi avec le bon compte (bouton Déconnexion) |
| La fenêtre « Session expirée » | Reconnecte-toi : ta saisie est conservée |
| Une modification d'un·e collègue n'apparaît pas | Clique sur « Actualiser » |
| Un contenu n'est pas à l'écran | Statut Programmé/Publié ? Support TV ? Dates ? Non archivé ? Vérifie dans Diffusion TV avec la date simulée |
| Vignette d'image grise dans l'outil | Vérifie que ton navigateur est connecté au même compte Google ; sinon, un·e admin peut retirer puis redonner ton accès (cela repartage le dossier des médias) |
| « Publication échouée » | Prévenir l'administrateur·rice (jeton GitHub expiré ou dépôt mal renseigné) |
