#!/usr/bin/env bash
# Copia las skills PERSONALES de esta maquina (~/.claude/skills/) al repo,
# para que viajen por git a cualquier otro equipo y a las sesiones en la nube.
#
# Uso:  bash scripts/sync-skills.sh
#
# Ignora a proposito la carpeta 'synced/': esas son las skills de Anthropic que
# ya llegan solas por tu cuenta de claude.ai. Duplicarlas en el repo solo anade
# ~4 MB y provoca colisiones de nombre.

set -euo pipefail

SRC="${HOME}/.claude/skills"
REPO_ROOT="$(git rev-parse --show-toplevel)"
DEST="${REPO_ROOT}/.claude/skills"

if [ ! -d "$SRC" ]; then
  echo "No existe $SRC — no hay skills personales en esta maquina."
  exit 0
fi

mkdir -p "$DEST"
copied=0
skipped=0

for dir in "$SRC"/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"

  # 'synced' son las de Anthropic: ya se sincronizan por cuenta.
  if [ "$name" = "synced" ]; then
    echo "  omitida  $name/  (skills de Anthropic, ya sincronizadas por tu cuenta)"
    skipped=$((skipped + 1))
    continue
  fi

  if [ ! -f "${dir}SKILL.md" ]; then
    echo "  omitida  $name  (sin SKILL.md, no es una skill valida)"
    skipped=$((skipped + 1))
    continue
  fi

  rm -rf "${DEST:?}/${name}"
  cp -R "$dir" "${DEST}/${name}"
  echo "  copiada  $name"
  copied=$((copied + 1))
done

echo
echo "Copiadas: $copied   Omitidas: $skipped"

if [ "$copied" -eq 0 ]; then
  echo
  echo "No tienes skills personales propias en esta maquina."
  echo "Todo lo que usas viene de tu cuenta o del propio Claude Code,"
  echo "y eso ya funciona en cualquier dispositivo sin hacer nada."
  exit 0
fi

# Aviso de posibles secretos antes de commitear.
echo
echo "Revisando posibles secretos en lo copiado..."
if grep -rIn -E '(api[_-]?key|secret|token|password|passwd|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{16,})' \
     "$DEST" 2>/dev/null; then
  echo
  echo "  !! Hay coincidencias arriba. Revisalas y limpialas ANTES de commitear."
else
  echo "  Sin coincidencias obvias."
fi

git -C "$REPO_ROOT" add .claude/skills

branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"

echo
echo "Listo. Los archivos ya estan en staging. Para subirlos:"
echo
echo "  git commit -m \"Add project skills so they work on every device\""
echo "  git push -u origin ${branch}"
echo
