#!/usr/bin/env bash
# Localiza y copia al repo las skills propias de esta maquina, para que viajen
# por git a cualquier otro equipo y a las sesiones de Claude Code en la web.
#
# Uso:
#   bash scripts/sync-skills.sh              # busca y copia
#   bash scripts/sync-skills.sh RUTA [RUTA]  # ademas copia estas carpetas
#
# Omite a proposito ~/.claude/skills/synced/: son las skills de Anthropic, que
# ya llegan solas por tu cuenta de claude.ai. Duplicarlas anadiria ~4 MB al
# repo y provocaria colisiones de nombre.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEST="${REPO_ROOT}/.claude/skills"
PERSONAL="${HOME}/.claude/skills"

echo "== 1. Buscando SKILL.md en ${HOME} =="
echo

# Todas las skills del equipo: personales, de plugins y de otros proyectos.
mapfile -t FOUND < <(
  find "$HOME" \
    \( -name node_modules -o -name .git -o -name Library -o -name .Trash \) -prune -o \
    -name SKILL.md -print 2>/dev/null \
  | sed 's|/SKILL.md$||' \
  | grep -v "${PERSONAL}/synced/" \
  | sort
)

if [ "${#FOUND[@]}" -eq 0 ]; then
  echo "  No se encontro ninguna skill propia en esta maquina."
else
  for d in "${FOUND[@]}"; do
    case "$d" in
      "$PERSONAL"/*) tag="personal" ;;
      "$REPO_ROOT"/*) tag="ya en el repo" ;;
      *"/.claude/plugins/"*) tag="de plugin" ;;
      *) tag="otro proyecto" ;;
    esac
    printf '  [%-13s] %s\n' "$tag" "$d"
  done
fi

echo
echo "== 2. Copiando al repo =="
echo

mkdir -p "$DEST"
copied=0

copy_one() {
  local dir="${1%/}" name
  name="$(basename "$dir")"
  if [ ! -f "${dir}/SKILL.md" ]; then
    echo "  omitida  ${name}  (sin SKILL.md)"
    return
  fi
  if [ -e "${DEST}/${name}" ] && [ "$(cd "$dir" && pwd)" = "$(cd "${DEST}/${name}" && pwd)" ]; then
    echo "  ya esta  ${name}"
    return
  fi
  rm -rf "${DEST:?}/${name}"
  cp -R "$dir" "${DEST}/${name}"
  echo "  copiada  ${name}"
  copied=$((copied + 1))
}

# Las personales se copian solas.
if [ -d "$PERSONAL" ]; then
  for dir in "$PERSONAL"/*/; do
    [ -d "$dir" ] || continue
    [ "$(basename "$dir")" = "synced" ] && continue
    copy_one "$dir"
  done
fi

# Rutas extra pasadas como argumento (p. ej. skills de otro proyecto).
for extra in "$@"; do
  if [ -d "$extra" ]; then
    copy_one "$extra"
  else
    echo "  no existe la ruta: ${extra}"
  fi
done

echo
echo "Copiadas: ${copied}"

if [ "$copied" -eq 0 ]; then
  echo
  echo "Nada que copiar desde ~/.claude/skills/."
  echo "Si en la lista de arriba aparecen skills bajo 'otro proyecto' o 'de"
  echo "plugin', vuelve a lanzar el script pasando sus rutas como argumento:"
  echo
  echo "  bash scripts/sync-skills.sh RUTA_1 RUTA_2"
  echo
  exit 0
fi

echo
echo "== 3. Revisando posibles secretos =="
if grep -rIn -E '(api[_-]?key|secret|token|password|passwd|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{16,})' \
     "$DEST" 2>/dev/null; then
  echo
  echo "  !! Coincidencias arriba. Revisalas y limpialas ANTES de commitear."
else
  echo "  Sin coincidencias obvias."
fi

git -C "$REPO_ROOT" add .claude/skills
branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"

echo
echo "Listo, ya estan en staging. Para subirlas:"
echo
echo "  git commit -m \"Add project skills so they work on every device\""
echo "  git push -u origin ${branch}"
echo
