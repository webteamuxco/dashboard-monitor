#!/usr/bin/env sh
# Lance gitleaks en version épinglée. Le binaire est téléchargé au premier appel
# dans .cache/ (ignoré par git) et son empreinte SHA-256 est vérifiée.
#
#   sh scripts/gitleaks.sh git --pre-commit --staged   # hook pre-commit
#   sh scripts/gitleaks.sh git . --redact              # tout l'historique
#
# Configuration des règles : .gitleaks.toml à la racine du dépôt.
set -eu

VERSION=8.30.1

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) PLATFORM=linux_x64 ;;
  Linux-aarch64 | Linux-arm64) PLATFORM=linux_arm64 ;;
  Darwin-x86_64) PLATFORM=darwin_x64 ;;
  Darwin-arm64) PLATFORM=darwin_arm64 ;;
  *) echo "gitleaks.sh : plateforme non prise en charge ($(uname -s)-$(uname -m))" >&2; exit 1 ;;
esac

ROOT="$(git rev-parse --show-toplevel)"
DIR="$ROOT/.cache/gitleaks-$VERSION-$PLATFORM"
BIN="$DIR/gitleaks"

if [ ! -x "$BIN" ]; then
  URL="https://github.com/gitleaks/gitleaks/releases/download/v$VERSION"
  TGZ="gitleaks_${VERSION}_${PLATFORM}.tar.gz"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  echo "gitleaks.sh : téléchargement de gitleaks $VERSION ($PLATFORM)…" >&2
  curl -fsSL -o "$TMP/$TGZ" "$URL/$TGZ"
  curl -fsSL -o "$TMP/checksums.txt" "$URL/gitleaks_${VERSION}_checksums.txt"
  EXPECTED="$(grep " $TGZ\$" "$TMP/checksums.txt" | cut -d' ' -f1)"
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL="$(sha256sum "$TMP/$TGZ" | cut -d' ' -f1)"
  else
    ACTUAL="$(shasum -a 256 "$TMP/$TGZ" | cut -d' ' -f1)"
  fi
  if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
    echo "gitleaks.sh : empreinte SHA-256 invalide pour $TGZ" >&2
    exit 1
  fi
  mkdir -p "$DIR"
  tar xzf "$TMP/$TGZ" -C "$DIR" gitleaks
fi

# Toujours appliquer les règles du dépôt, même si la cible n'est pas la racine
# (gitleaks ne cherche .gitleaks.toml que dans le dossier scanné).
case " $* " in
  *" -c "* | *" --config "* | *" --config="*) exec "$BIN" "$@" ;;
  *) exec "$BIN" "$@" --config "$ROOT/.gitleaks.toml" ;;
esac
