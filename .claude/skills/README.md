# Skills del proyecto

Las skills que se coloquen aqui (`.claude/skills/<nombre>/SKILL.md`) viajan por
git: se cargan solas en cualquier equipo que clone este repo y en las sesiones
de Claude Code en la web, sin configurar nada.

## Los tres niveles de skills

| Nivel | Ubicacion | Viaja entre dispositivos |
|---|---|---|
| Personales | `~/.claude/skills/` en cada maquina | No. Solo existen en ese equipo. |
| **Del proyecto** | **`.claude/skills/` (esta carpeta)** | **Si, por git.** |
| De la cuenta | se sincronizan desde claude.ai | Si, automatico. |

## Como portar tus skills personales

Desde la raiz del repo, en la maquina que las tenga:

```bash
bash scripts/sync-skills.sh
```

Primero lista todas las skills que encuentra en la maquina —personales, de
plugins y de otros proyectos— indicando de donde sale cada una. Luego copia las
personales a esta carpeta, omite las de Anthropic (que ya se sincronizan por
cuenta), avisa si detecta posibles secretos y deja todo en staging.

Si en el listado aparece una skill bajo `otro proyecto` o `de plugin`, pasa su
ruta como argumento para copiarla tambien:

```bash
bash scripts/sync-skills.sh ~/ruta/a/la/skill ~/otra/skill
```

## Antes de commitear

Revisa que ninguna skill lleve rutas absolutas de tu maquina, tokens o claves
dentro del `SKILL.md` o de sus scripts. Este repo es compartido.
