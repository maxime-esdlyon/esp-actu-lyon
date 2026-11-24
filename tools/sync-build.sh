#!/bin/bash
# Recopie la fonction buildPublic() de admin/index.html dans apps-script/Code.gs
# (elle doit être identique des deux côtés). À lancer après toute modification de cette fonction.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp)"
awk '/^function buildPublic\(db, opt\) \{/{f=1} f{print} f&&/^}$/{exit}' "$DIR/admin/index.html" > "$TMP"
[ -s "$TMP" ] || { echo "buildPublic introuvable dans admin/index.html" >&2; exit 1; }
# Remplace soit le repère, soit l'ancienne copie (du repère de début jusqu'à la fin du fichier)
awk -v f="$TMP" '
  /^\/\*@@BUILD_PUBLIC@@\*\/$/ { while ((getline l < f) > 0) print l; skip=0; done=1; next }
  /^function buildPublic\(db, opt\) \{/ && !done { while ((getline l < f) > 0) print l; skip=1; done=1; next }
  skip && /^}$/ { skip=0; next }
  !skip { print }
' "$DIR/apps-script/Code.gs" > "$TMP.gs"
mv "$TMP.gs" "$DIR/apps-script/Code.gs"
rm -f "$TMP"
echo "buildPublic synchronisée dans Code.gs"
