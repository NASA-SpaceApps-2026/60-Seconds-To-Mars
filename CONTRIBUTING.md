# Cómo trabajamos en equipo

Guía rápida para no pisarnos el código. Las reglas técnicas completas están en [`CLAUDE.md`](./CLAUDE.md).

## 1. Arrancar el proyecto (solo la primera vez)

```bash
git clone https://github.com/YerayEspinosaEsteban/60-seconds-to-mars.git
cd 60-seconds-to-mars
cp .env.example .env.local      # en Windows (PowerShell): Copy-Item .env.example .env.local
npm install && npm run dev
```

- Abre la URL que muestra la terminal (normalmente http://localhost:5173).
- **Sin clave de Gemini el juego funciona igual** (usa los eventos de respaldo). Si quieres probar la IA, pon tu propia clave en `.env.local`.
- `.env.local` y `.dev.vars` **nunca se suben** (están en `.gitignore`). No pegues claves en el código ni en el chat.

## 2. Las ramas

| Rama | Para qué sirve |
|---|---|
| `main` | Producción. Solo versiones listas para enseñar al jurado. **Nadie trabaja aquí directamente.** |
| `develop` | Integración: aquí juntamos el trabajo de todos mediante Pull Requests. |
| `feat/phase1-quiz-story` | Menú, trivia de 60 s, historia en viñetas y banco de preguntas. |
| `feat/phase2-bunker-ui` | Pantalla del búnker, escena de Marte, velocímetros y minijuegos. |
| `feat/ai-nasa-data` | Gemini, NASA DONKI, Cápsula Orbital (CS:GO), voz de A.R.I.A. y pantalla final. |

## 3. Qué archivos toca cada rama (así no hay conflictos de merge)

**`feat/phase1-quiz-story`**
- `src/components/MenuScreen.tsx`
- `src/components/Phase1Scavenge.tsx`, `src/components/phase1/*` (`Phase1Quiz`, `Phase1Summary`, `Phase1Shared`)
- `src/components/StoryComicModal.tsx`
- `src/data/triviaQuestions.ts`

**`feat/phase2-bunker-ui`**
- `src/components/Phase2Bunker.tsx`, `src/components/BunkerDiorama.tsx`, `src/components/GaugeMeter.tsx`
- `src/components/minigames/EmergencyMinigameModal.tsx`
- `src/components/DeepSpaceLink.tsx`, `src/components/PeriscopeModal.tsx`, `src/components/AriaRobot.tsx`

**`feat/ai-nasa-data`**
- `src/services/geminiGameMaster.ts`, `src/services/geminiSchemas.ts`, `src/services/nasaApi.ts`, `functions/api/gemini.ts`
- `src/components/SalvageRouletteModal.tsx`, `src/data/salvagePrizes.ts`
- `src/utils/ariaVoice.ts`, `src/components/AriaAssistantWidget.tsx`, `src/components/AriaConsole.tsx`
- `src/components/GameOverScreen.tsx`

**Archivos compartidos (¡cuidado!)**: `src/types/game.ts`, `src/store/useGameStore.ts`, `src/data/stationItems.ts`, `src/data/missionExtras.ts`, `src/index.css`, `CLAUDE.md`.
- Solo **añade** (un campo, una acción, una constante). **No renombres ni borres** sin avisar por el grupo: rompe las ramas de los demás.
- Haz PRs pequeñas y frecuentes cuando toques estos archivos.

## 4. El día a día: 4 comandos

Antes de empezar a trabajar y antes de abrir una PR, trae lo último de `develop` a tu rama:

```bash
git checkout feat/TU-RAMA && git pull origin develop      # 1. Ponte en tu rama y baja lo último del equipo
git add -A && git commit -m "feat(bunker): describe tu cambio"   # 2. Guarda tu trabajo (Conventional Commits)
git push                                                   # 3. Súbelo a GitHub
gh pr create --base develop --fill                         # 4. Abre la Pull Request hacia develop (o desde la web de GitHub)
```

- Antes del paso 2, comprueba que `npm run build` compila sin errores (la CI lo vuelve a comprobar en cada PR).
- Si `git pull` da conflictos: abre los archivos marcados, quédate con lo correcto, `git add` y `git commit`. Si dudas, pregunta antes de forzar nada.
- **Nunca** uses `git push --force` en `main` ni en `develop`.

## 4 bis. Cómo llega tu trabajo a `main` (paso a paso, sin romper nada)

`main` y `develop` están **protegidas**: no se puede hacer `git push` directo. Todo entra por **Pull Request (PR)** y la CI ("Build (tsc + vite)") tiene que salir en verde.

**Paso 0 · Ponte al día (OBLIGATORIO antes de seguir trabajando).** `develop` y `main` han cambiado mucho (responsive sin zoom, menú nuevo, manifiesto de carga, debriefing…):

```bash
git fetch origin
git checkout feat/TU-RAMA
git merge origin/develop          # trae lo último del equipo a tu rama
npm install                       # por si cambiaron dependencias
npm run build                     # debe terminar sin errores
```
Si salen conflictos: en los archivos marcados con `<<<<<<<` quédate con la versión de `develop` y vuelve a añadir encima **solo tu cambio**; luego `git add .` y `git commit`.

**Paso 1 · Trabaja y guarda.**
```bash
npm run build                                       # 0 errores antes de cada commit
git status                                          # NO debe aparecer .env.local ni .dev.vars
git add src/ruta/de/tu/archivo.tsx                  # mejor añadir archivos concretos que "git add -A"
git commit -m "feat(bunker): describe tu cambio"
git push origin feat/TU-RAMA
```

**Paso 2 · PR hacia `develop`.** En GitHub: *Compare & pull request* → base **`develop`** ← tu rama (o `gh pr create --base develop --fill`).
Espera a que la CI salga en verde y a que otra persona la revise. Luego **Squash and merge**.

**Paso 3 · De `develop` a `main` (solo cuando esté probado).** Una persona del equipo (Yeray) abre la PR **`main` ← `develop`**, prueba el juego entero
(Menú → trivia → búnker 10 Soles → debriefing) y la fusiona con **Merge** (no squash, para que `main` y `develop` sigan iguales).
Si Cloudflare Pages está conectado al repo, publica `main` automáticamente.

**Reglas de oro**
- Nunca `git push --force` ni `git push origin main`.
- Nunca subas claves: `.env.local` y `.dev.vars` están en `.gitignore`; si `git status` los muestra, **para y avisa**.
- Antes de la PR, revisa en el navegador a 1366×768 y 1280×720 (puedes usar los atajos de `npm run dev`: `#qa-quiz`, `#qa-summary`, `#qa-bunker`,
  `#qa-bunker-systems`, `#qa-bunker-decision`, `#qa-gameover`).
- Nada de emojis en `src/`, nada de `zoom`: sigue las reglas de `CLAUDE.md`.
- Si cambias una mecánica o un texto que sale en `DOCS_ARQUITECTURA.md` o `PITCH_SCRIPT.md`, actualízalos en la misma PR.

## 5. Mensajes de commit (Conventional Commits)

`tipo(área): qué hace` → por ejemplo:
- `feat(quiz): añade 10 preguntas de radiación`
- `fix(bunker): el interruptor de la lámpara no se apagaba`
- `style(menu): ajusta márgenes de las tarjetas`
- `docs: actualiza CONTRIBUTING`

Tipos: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`.
