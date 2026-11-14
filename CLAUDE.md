# CLAUDE.md — Contrato técnico de "60 Seconds to Mars: The Solar Storm Protocol"

> Léelo ANTES de tocar código. Es el contrato entre ramas del equipo y los agentes de IA.
> NASA Space Apps Challenge · Reto "Build a Junior Astronaut Mission Trainer".

## 1. Qué es
Juego web educativo para niños de **7 a 12 años**, en **español**. Dos fases:
1. **Fase 1 · Trivia contrarreloj** (`phase1Stage`: `'ready' → 'quiz' → 'summary'`):
   - 60 s para responder preguntas del banco de 45 (`data/triviaQuestions.ts`: 9 por rama vital, fácil/media/difícil, dificultad progresiva con `buildQuizQueue`).
   - Acierto ⇒ objeto **de la misma rama** directo al `bunkerInventory` (fácil→común, media→raro, difícil→épico/legendario). Sin límite de huecos.
   - Rama con 0 aciertos (o <1/3 con ≥3 intentos) ⇒ **complicación** (`COMPLICATIONS`): −20 inicial, −4/Sol extra y máquinas de esa rama **averiadas** (`isMachineBroken`).
   - Resumen SIN avance automático (se entra a la base solo con el botón); si fue muy mal (≤3 aciertos o ≥3 complicaciones) ⇒ `freeSpins = 1` en la Cápsula de Salvación.
   - 30 objetos (`data/stationItems.ts`), cada uno con `category` (rama vital) y `rarity` (`common | rare | epic | legendary`).
2. **Cápsula de Salvación** (`SalvageRouletteModal`, `data/salvagePrizes.ts`): ruleta a pantalla completa en Fase 2 (y en el resumen de Fase 1 con giro gratis).
   Giros: emergencia (gratis 1 vez con barra <30), energético (−20 ⚡), científico (−15 📡 o −20 🌱), trueque de chatarra (desmonta 1 objeto). Acción `salvageSpin(kind, scrapItemId?)`.
2. **Fase 2 (10 Soles):** gestionar 5 barras vitales con interruptores ON/OFF y un dilema diario generado por Gemini (con fallback offline).

Filosofía: **ninguna decisión es gratis** (trade-offs de ingeniería). Datos reales de NASA DONKI y NASA OSDR.

## 2. Stack (no cambiar sin acuerdo del equipo)
Vite 8 · React 19 · TypeScript 7 (`strict`) · TailwindCSS 4 (`@tailwindcss/vite`) · Framer Motion · lucide-react · canvas-confetti · Zustand 5 · `@google/genai`.
Voz = `window.speechSynthesis` · SFX = Web Audio API. **Cero archivos de audio.**

## 3. Estructura
```
functions/api/gemini.ts        Proxy Cloudflare Pages Function (oculta GEMINI_API_KEY)
src/
├── types/game.ts              Interfaces (contrato de datos)
├── data/stationItems.ts       12 objetos, salas, capacidad, inventario de debug
├── data/fallbackNasaData.ts   4 llamaradas reales DONKI + 10 eventos de respaldo
├── services/nasaApi.ts        fetch DONKI/FLR con timeout + fallback (nunca lanza)
├── services/geminiSchemas.ts  Esquemas JSON + systemInstruction infantil (compartido con functions/)
├── services/geminiGameMaster.ts  Transporte híbrido + validación + fallback (nunca lanza)
├── utils/soundEffects.ts      Sintetizador Web Audio
├── utils/ariaVoice.ts         3 modos: 'natural' (mejor voz es) | 'beeps' (pitidos + texto letra a letra) | 'silent'
├── utils/useAriaVoiceState.ts Hooks: estado de la voz y texto "letra a letra"
├── store/useGameStore.ts      ÚNICO store Zustand + toda la matemática del juego
├── data/triviaQuestions.ts    Preguntas del Reto de Cadetes + premios de la Ruleta Orbital
├── components/                MenuScreen, Phase1Scavenge (orquesta phase1/*), Phase2Bunker, GameOverScreen,
│                              AriaAssistantWidget (modos de voz + ajustes), AriaConsole, BunkerDiorama (ventana con tornillos),
│                              GaugeMeter (velocímetros SVG), MissionPatchLogo (emblema ORIGINAL, no logo NASA)
│   ├── SalvageRouletteModal   Cápsula de Salvación a pantalla completa
│   ├── NasaLogo               Logo de cabecera (ver config/branding.ts)
│   └── phase1/                Phase1Quiz (trivia 60 s), Phase1Summary (resumen sin temporizador), Phase1Shared
├── config/branding.ts         Interruptor del logo oficial de la NASA
├── data/salvagePrizes.ts      Premios, ruedas y costes de la Cápsula de Salvación
└── App.tsx                    Orquestador por gamePhase
```

## 4. Tipos clave (`src/types/game.ts`)
```ts
type GamePhase = 'MENU' | 'PHASE_1_SCAVENGE' | 'PHASE_2_BUNKER' | 'GAME_OVER';
type RoomId = 'greenhouse' | 'lab' | 'storage';
type ItemId = 'lead_blanket' | 'hydro_recycler' | 'osdr_seeds' | 'lithium_battery' | 'freeze_food_a'
  | 'freeze_food_b' | 'o2_tanks' | 'mag_shield_booster' | 'med_kit' | 'high_gain_antenna'
  | 'space_duct_tape' | 'co2_scrubbers';
interface Vitals { oxygen; power; food; shield; crewHealth }      // 0-100
type VitalKey = keyof Vitals;
type Effects = Partial<Vitals> & { science?: number };
type ItemKind = 'machine' | 'passive' | 'consumable' | 'tool';
interface StationItem { id; name; shortName; emoji; room; slots: 1|2|3|4; powerPerSol; kind;
  effectPerSol?: Effects; useEffect?: Effects; description; nasaFact; nasaSource; color }
type RadiationLevel = 'low' | 'moderate' | 'high' | 'extreme';
interface EventOption { id; label; description; effects: Effects; requiredItemId: ItemId | null; ariaReactionVoice }
interface DailyEvent { sol; title; ariaVoiceAlert; description; nasaFact; nasaSource; radiationLevel;
  options: EventOption[]; source: 'gemini' | 'fallback'; key? }
interface NASAWeather { flareClass; peakTime; sourceLocation; activeRegion; link; isLive; intensity }
interface SolReport { sol; eventTitle; optionLabel; ariaReaction; deltas: Required<Effects>; harvested; radiationLevel }
interface Debrief { headline; report; lessons: string[]; bestDecision; improvementTip; source }
type Rank = 'Cadete Espacial' | 'Ingeniero de Sistemas Artemisa' | 'Comandante Marciano';
type MissionOutcome = 'victory' | 'evacuation';
```
**Añadir un campo** a un tipo = OK. **Renombrar/borrar** = avisar al equipo (rompe otras ramas).

## 5. Store (`src/store/useGameStore.ts`)
### Constantes de equilibrio
| Constante | Valor | Notas |
|---|---|---|
| `PHASE1_SECONDS` | 60 | |
| `TOTAL_SOLS` | 10 | |
| `INITIAL_VITALS` | O2 60 · ⚡75 · 🌱50 · 🛡️60 · ❤️100 | |
| `BASE_DECAY` | O2 −14 · 🌱 −14 · ⚡ −3 por Sol | Base espacial vacía ⇒ evacuación ~Sol 3-4 |
| `RADIATION_DAMAGE` | low 4 · moderate 7 · high 11 · extreme 16 | Manta de plomo ⇒ ÷2 |
| `SEED_HARVEST` / `SEED_SOLS_TO_HARVEST` | +20 / cada 2 Soles ON | |
| Salud por Sol | −8 si escudo<30 · −6 si O2<25 · −6 si comida<25 · si no +3 | en `computeSolTick` |
| `BUNKER_CAPACITY` (data) | 12 | |

### Funciones puras exportadas (úsalas, no dupliques matemática en componentes)
`usedSlots`, `estimatedPowerBalance`, `availableItems`, `computeSolTick`, `applyEffects` (clamp 0-100), `findFailedVital`, `computeRank`.

### Acciones
| Acción | Qué hace |
|---|---|
| `loadNasaWeather()` | DONKI en vivo → `nasaStatus: 'live' \| 'fallback'` |
| `testGemini()` | Ping real a Gemini → `aiDiagnostics` (se lanza en segundo plano al abrir el Menú; sin píldora visible) |
| `ariaSay(text)` | Mensaje + voz/pitidos de A.R.I.A. según `voiceMode` |
| `setVoiceMode(mode)` / `toggleVoice()` | `voiceMode: 'beeps' (por defecto) \| 'natural' \| 'silent'`; voz/tono/velocidad en `ariaVoice.setVoice/setPitch/setRate/setGender` (localStorage `aria-voice-settings-v2`) |
| `startGame()` | → `PHASE_1_SCAVENGE` en `phase1Stage: 'ready'`, resetea todo y construye la cola de preguntas |
| `beginQuiz()` / `answerQuiz(answer)` / `nextQuizQuestion()` | Trivia contrarreloj; el objeto ganado entra en `bunkerInventory` |
| `tickTimer()` / `finishQuiz()` | Reloj de 60 s; al terminar calcula `complications` y `freeSpins` → `'summary'` |
| `sealBunker()` | Vitals = iniciales + `supplyBonus` + penalización de complicaciones; máquinas averiadas OFF |
| `getSpinAvailability()` / `salvageSpin(kind, scrapItemId?)` | Cápsula de Salvación (devuelve `SalvageSpinResult` o `{ error }`) |
| `setActiveRoom`, `addItem(id): boolean`, `removeItem` | Fase 1 (addItem suena error y hace temblar si no cabe) |
| `tickTimer()` | −1 s y avisos de A.R.I.A. en 40/20/10 s |
| `sealBunker()` | → `PHASE_2_BUNKER`, máquinas ON por defecto |
| `debugSkipToPhase2()` | Fase 2 con `DEBUG_INVENTORY` (sin botón en pantalla; lo usan las órdenes y `devQa`) |
| `runAriaCommand(text)` / `forceGameOver(outcome)` | Órdenes de presentación: **supervivencia** → base espacial, **final** → pantalla final (victoria), **derrota** → evacuación. Se escriben/dicen en `AriaCommandInput` (menú, con micrófono si el navegador lo permite), en la consola de A.R.I.A. de la base espacial, o se teclean en cualquier pantalla fuera de un campo de texto (`App.tsx`). |
| `toggleMachine`, `useConsumable` | Panel de ingeniería |
| `loadSolEvent()` | Gemini/fallback, mínimo 700 ms de animación, ignora resultados obsoletos (`requestId`) |
| `chooseOption(id)` | Aplica opción → `computeSolTick` → `solStage: 'report'` |
| `continueAfterReport()` | Siguiente Sol o `GAME_OVER` |
| `loadDebrief()`, `playAgain()`, `resetToMenu()` | Fin de partida |

`solStage`: `'loading' → 'event' → 'report'` en cada Sol.

## 6. Reglas de arquitectura (OBLIGATORIAS)
1. **Un único store** Zustand. Nada de estado de juego en `useState` salvo UI local (animaciones).
2. **Los servicios nunca lanzan.** `nasaApi` y `geminiGameMaster` hacen try/catch y devuelven fallback. El juego nunca puede quedarse en blanco:
   cada pantalla va dentro de `ScreenErrorBoundary` (App.tsx; aviso "Interferencia en la pantalla" con Reintentar / Menú) y `Phase1Scavenge` NO usa `AnimatePresence mode="wait"` (el resumen se monta al instante).
3. **Todo lo que viene del LLM pasa por el validador** (`parseGeminiEvent` → `ensurePlayable`):
   - Efectos de barras recortados a **[−35, +35]**, ciencia a [−20, +50]; barras siempre en [0, 100] (`applyEffects`).
   - **Anti soft-lock:** siempre ≥1 opción jugable; si todas requieren objetos ausentes se limpia `requiredItemId` de la 2.ª opción.
   - **Trade-off obligatorio:** opción sin ningún efecto negativo ⇒ se añade −10 de energía u oxígeno.
   - Textos: longitud máxima, sin caracteres de control y filtro de palabras prohibidas (`UNSAFE_WORDS`).
4. **Guardarraíl infantil:** `SYSTEM_INSTRUCTION` en `geminiSchemas.ts`. Nunca "muerte": se dice **"evacuación médica a la órbita"** o **"fatiga espacial"**.
5. **Secretos:** la clave de Gemini **nunca** en el bundle de producción. `VITE_GEMINI_API_KEY` solo se lee si `import.meta.env.DEV`. En producción → `/api/gemini`. No importes `import.meta.env.VITE_GEMINI_API_KEY` en ningún otro archivo.
6. **Voz:** en voz natural `ariaVoice.speak()` **nunca corta a mitad de frase**: trocea el texto en frases (≤160 caracteres), deja terminar la frase en curso y pasa al mensaje nuevo (descarta el resto del anterior). Ignora el mismo texto repetido en <2,5 s, velocidad máx. 1,2 y `cancel()` solo al parar o si el navegador se cuelga (con 180 ms de respiro). **Sincronía con pantallas:** cada cambio de `gamePhase` corta el audio (`ariaVoice.interrupt()`) y lo retiene (`hold("screen")`) hasta que la pantalla nueva llama a `useAriaScreenReady()` (tras su fundido de entrada); con una historia abierta (`hold("story")`) solo hablan sus viñetas (`ariaSay(text, { story: true })`) y el último mensaje del juego se dice al cerrarla. Toda pantalla principal nueva debe llamar a `useAriaScreenReady()`. Audio se desbloquea con `unlockAudio()` en el primer clic.
7. Fase 1 es **point-and-click**: sin WASD ni físicas.
8. `BunkerDiorama` no toca el store: recibe props (vitals, inventario, máquinas, radiación, averías, envío de Houston) y avisa de los clics con callbacks.
   Umbrales de expresión: O2<35 mareo · comida<35 hambre · energía<30 penumbra+frío · escudo<35 o radiación alta/extrema alarma · salud<35 fatiga · todo>50 sonrisas.
9. Pantallas de juego `h-dvh overflow-hidden` (en móvil pueden hacer scroll); el scroll va dentro de paneles (`thin-scroll`).
10. **Estética "NASA White":** fondos `bg-slate-100`, paneles `.hw-panel`, etiquetas `.tech-label`, colores `nasa-blue` (#0B3D91) y `nasa-red` (#FC3D21) definidos en `@theme` de `index.css`. Las clases propias van en `@layer components` para que las utilidades de Tailwind las puedan sobrescribir.
    **Minimalismo y legibilidad:** nada de texto por debajo de `text-xs` (12px; preferible `text-sm`/`text-base`), sin cajas dentro de cajas; los detalles secundarios van en `title`/tooltip o en un acordeón cerrado.
    Únicos códigos técnicos permitidos: `FASE 0N` + telemetría corta (`T-00:60`, `SOL 01-10`, `SYS CHECK`, `ETA SOL 10`) en las 4 tarjetas de fases del Menú y `SYS-O2 · SYS-PWR · SYS-AGR · SYS-RAD · SYS-MED` (`SYSTEM_META` / `SystemLabel` en `phase1/Phase1Shared.tsx`).
    **Paleta de Fase 1 y Menú monocromática:** sin colores por rama ni emojis sueltos; iconos `lucide-react` (`strokeWidth={1.75}`) en Azul NASA, fondos `bg-white`/`bg-slate-50`, bordes `slate-300`. Dificultad y rareza solo en gris → Azul NASA → Rojo Misión.
    **Cero emojis Unicode en `src/`** (ni en datos, ni en UI, ni en comentarios). Toda la iconografía sale de `src/components/icons.tsx`:
    `ITEM_ICONS` (30 objetos), `RESOURCE_ICONS` (5 barras + ciencia), `PRIZE_ICONS` (premios) y los componentes `ItemIcon`/`ResourceIcon`/`PrizeIcon`.
    Los tipos `StationItem` y `SalvagePrize` ya **no tienen campo `emoji`**; `VITAL_META`/`CATEGORY_META` tampoco. Un objeto nuevo necesita su entrada en `ITEM_ICONS`.
    Dentro de un SVG, los iconos lucide se anidan con `x`, `y` y `size` (ver `BunkerDiorama`).
    **Cápsula Orbital** (`SalvageRouletteModal`): carrusel horizontal tipo "case opening" de 50 tarjetas (ganadora en la 42), 4,5 s con `ease [0.12, 0.8, 0.18, 1]`, en un panel `w-[95vw] max-w-6xl min-h-[min(80dvh,42rem)]` (carrusel, iconos y botón escalan con `dvh`; la lista "Contenido de la cápsula" se oculta con alto < 680 px) (cabecera con recursos y cápsula · carrusel a todo el ancho · botón y premio centrados),
    `playCaseTick()` cada vez que una tarjeta cruza el láser. Grados (`SUPPLY_TIER_META`): Estándar `#3b82f6` · Avanzado `#8b5cf6` · Prototipo `#ec4899` · Legendario NASA `#f59e0b`.
    **Responsive real, SIN zoom artificial** (nada de `zoom`, `scale-[...]` ni `html.ui-zoom`): tipografía base fluida en `index.css`
    (`html { font-size: clamp(15px, 0.35vw + 11px, 18px) }`), todo en `rem`, alturas con `dvh` (`h-dvh`, `min-h-dvh`) y tamaños con `clamp()` + breakpoints.
    Objetivo: portátil de 1280×720 / 1366×768 al 100 % sin cortes. Si algo no cabe, scroll interno (`thin-scroll`) antes que letra pequeña.
    Monitores grandes: variante propia `big:` (`@custom-variant` en `index.css`: ≥1280 px de ancho Y ≥896 px de alto) para agrandar sin afectar a portátiles (la usa `Phase1Summary`).
    **QA visual (solo dev):** `src/utils/devQa.ts` → `#qa-quiz`, `#qa-summary`, `#qa-capsule`, `#qa-bunker`, `#qa-bunker-systems`, `#qa-bunker-decision`, `#qa-gameover`.
11. **No usar el logotipo oficial de la NASA** (uso restringido, 14 CFR 1221; las normas de Space Apps piden no usarlo). Se usa el emblema original `MissionPatchLogo` (texto circular `MISIÓN ARES IV` / `NASA · CADETES`, tamaño de letra calculado según la longitud); `USE_OFFICIAL_NASA_LOGO` en `src/config/branding.ts` está a `false` y debe seguir así.
12. Antes de hacer PR: `npm run build` con **0 errores**.

## 7. Gemini — transporte híbrido
Funciones públicas de `geminiGameMaster.ts`: `generateDailyMissionEvent`, `generateDebrief`, `testGeminiConnection`,
`askAriaQuestion(question, gameState: AriaGameState, currentEvent)` → respuesta ≤ ~40 palabras, sin regalar la partida;
fallback local `getFallbackAriaAnswer` (barra más baja / qué máquina apagar / dato NASA). Ninguna lanza errores.

1. `POST /api/gemini` `{ kind: 'event'|'debrief'|'ping'|'aria', prompt }` → `{ text }`. El servidor fija modelo, esquema y systemInstruction.
2. Si el proxy no existe (Vite dev ⇒ 404) y estamos en dev ⇒ SDK directo con `VITE_GEMINI_API_KEY`.
3. Errores 400/401/403/404 ⇒ Gemini desactivado en la sesión (fallback). 2 fallos seguidos ⇒ fallback. El botón **Test Gemini API** reinicia.
4. Modelo por defecto: `gemini-3.5-flash` (`gemini-2.5-flash` devuelve 404 para cuentas nuevas desde 2026).

## 8. Variables de entorno
| Archivo | Variable | Uso |
|---|---|---|
| `.env.local` (git-ignored) | `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`, `VITE_NASA_API_KEY` | Solo `npm run dev` |
| `.dev.vars` (git-ignored) | `GEMINI_API_KEY`, `GEMINI_MODEL` | `wrangler pages dev` |
| Cloudflare Pages → Secrets | `GEMINI_API_KEY`, `GEMINI_MODEL` | Producción |

## 9. Cómo añadir cosas sin romper nada
- **Nuevo objeto:** ampliar `ItemId` + entrada en `STATION_ITEMS` (+ `ITEM_LESSONS` opcional). El esquema de Gemini usa `ALL_ITEM_IDS` automáticamente.
- **Nuevo evento de respaldo:** añadir a `FALLBACK_EVENTS` con `key` única y **al menos una opción con `requiredItemId: null`**; cada opción con al menos un efecto negativo.
- **Nueva barra vital:** cambio de contrato → coordinar con todo el equipo.

## 10. Historia, Deep Space Network e insignias
- **Lore:** año 2038, base Ares-IV (Cráter Jezero). Los adultos se fueron en el rover a 40 km; la tormenta solar (DONKI) les corta el paso. Leo, Vega, Max y A.R.I.A. aguantan 10 Soles.
- **Modo Historia** (`StoryComicModal`, montado en `App.tsx` con carga diferida): lee `storyScene` del store (`'prologue' | 'lockdown' | 'radio_sol4' | 'radio_sol8'`).
  `startGame` → prólogo · `sealBunker` → compuertas · `continueAfterReport` al llegar a los Soles 4 y 8 → radio del rover. `closeStory()` la cierra ("Saltar historia").
- **Deep Space Network** (`DeepSpaceLink`, `data/missionExtras.ts`): `orderHoustonPackage(id)` cuesta −10 Energía hoy, 1 pedido por Sol, **máx. 3 pedidos por partida** (`HOUSTON_MAX_ORDERS`, contador `houstonOrdersPlaced`) y **máx. 2 en camino a la vez** (`HOUSTON_MAX_IN_TRANSIT`: hasta que no llegue uno no se pide otro), llega en 2 Soles (`houstonOrders`; se entrega en `continueAfterReport`).
- **Insignias** (`BADGES`, `awardBadge`, `badges`): Ingeniero Solar, Botánico GeneLab, Maestro del Trueque, Comunicador Deep Space, Héroe de Ares-IV. Se ven en el Periscopio (`PeriscopeModal`) y en la pantalla final.
- **Avisos** flotantes de la base espacial: `notice` + `dismissNotice` (`MissionNoticeToast`).
- **Distancia Tierra-Marte**: `utils/marsEphemeris.ts` (aproximación orbital; también da el retraso de la luz).
- **Contenedor de Houston:** cada paquete que llega suma +25 y un `houstonCrates`; `houstonLanding` hace que `Phase2Bunker` abra sola
  `SalvageRouletteModal` con `initialKind="houston"` + `autoSpin` (tirada gratis, `SpinKind 'houston'`, rueda `WHEELS.houston`).
  Si se cierra antes de abrirla, queda el botón "ABRIR CONTENEDOR DE HOUSTON" en el módulo Deep Space.

## 10 bis. Layout de la base espacial: escena exterior point-and-click a pantalla completa
- Barra superior intacta (SOL X/10, Periscopio, 5 velocímetros, Ciencia). Debajo, `BunkerDiorama` ocupa **todo** el resto de la pantalla.
- `BunkerDiorama` = paisaje del Cráter Jezero (cielo con auroras y partículas si la radiación DONKI es alta/extrema, montañas, dunas, rocas)
  con el **hábitat Ares-IV** grande en el centro (`BODY` 594×252): cúpula rebajada y **paneles curvos de cerámica lisa** (degradados `hab-body`,
  `hab-sheen`, `hab-top-light`; **sin remaches, cuadrícula, rejillas ni franjas de color**: base lisa blanco/plata) y 2 soportes angulares.
  **Visor panorámico estrecho** (`WIN` 470×86) dentro de un **bisel octogonal** titanio + azul marino (`BEZEL`): solo asoman los **cascos**
  (`CREW_SCALE` 1.5, `CREW_TOP` 82); las placas de nombre van en la banda azul del bisel (`SILL`) y las chapitas de estado encima.
  Iconos de máquinas a los lados (azul ON, rojo averiada).
- Sigue sin tocar el store: recibe datos y **callbacks** por props (`onHabitatClick`, `onAntennaClick`, `needsRepair`, `houstonEta`, `houstonArrived`).
- **Sin carteles fijos en el cielo.** Indicadores integrados en el dibujo:
  - **Casa** (clic → Sistemas e Inventario): brillo cian al pasar el ratón + tooltip. **Luces LED alargadas en el bisel** (`LedStrip`): verdes OK, rojas parpadeantes con averías.
  - **Antena** (clic → Enlace Houston): siempre con resplandor cian y ondas concéntricas; tooltip con el estado del envío solo al pasar el ratón.
- **Avisos agrupados** (HTML, arriba a la izquierda): ALERTA RADIACIÓN (clase DONKI), MODO AHORRO, "N averías — Toca la base", envío de Houston.
- **Leyenda interactiva** (abajo a la izquierda): "Base espacial: Sistemas/Averías" (nº averías) · "Antena: Enlace Houston" (Disponible / En camino / Envío recibido) · "Robot A.R.I.A.".
- **Estado único de paneles** en `Phase2Bunker`: `activeOverlay: 'none' | 'systems' | 'houston' | 'aria' | 'decision' | 'periscope'`.
  Abrir uno cierra el anterior; un **fondo único clicable** o **ESC** lo cierran. `AriaRobot` es controlado (`open`/`onOpenChange`); su bocadillo va bajo el robot.
- **Botón "Resolver Misión Sol N"** (abajo a la derecha): abre el ordenador (`'decision'`) con el evento, el Dato Real NASA y las decisiones.
  Las tarjetas de decisión usan `border-2` (no `ring`) y no escalan al pasar el ratón, para no salirse del contenedor con scroll.
  Tras el Sol 10 el botón dice **"Finalizar misión final"** (o "Finalizar misión (evacuación)" si se evacúa antes).
- **Fotos reales de Marte**: `fetchMarsSurfacePhotos()` en `nasaApi.ts` (NASA Image and Video Library, `images-api.nasa.gov`, filtra ilustraciones
  y mapas, resumen en español + texto original). Store: `marsPhotos`, `marsPhotosStatus`, `loadMarsPhotos()` (se llama **al arrancar la app**, en `App.tsx`).
  - URL de cada foto: `pickImageHref()` elige un enlace REAL de `links` (`render === 'image'`, preferencia medium > small > large > orig, `https`).
    **Nunca inventar tamaños**: reescribir `~small` → `~medium` daba 403 en ~1 de cada 4 fotos.
  - **Respaldo local infalible** en `public/mars/mars-1..4.jpg` (4 fotos reales de Perseverance, dominio público; ver `public/mars/CREDITS.txt`):
    se usan si la API falla y, mediante `onError` → `localMarsImageFor(id)`, si una imagen remota no carga en el navegador.
  - Si al llegar un envío aún no hay fotos, se usan las locales; Houston siempre trae foto (repite del álbum solo si ya se vieron todas).
- **Transmisiones con foto real** (`ArrivalTransmission`, `data/fieldNotes.ts`): las fotos NO están en un botón suelto; llegan dentro de la historia.
  En `continueAfterReport`: siempre con un envío de Houston y, si no, cada 2-3 Soles desde el rover de rescate o una sonda (no en los Soles 4 y 8).
  **Puesta en escena:** un personaje entra en grande por la derecha (**Comandante Elena** del rover, o **A.R.I.A.** para la sonda) con su diálogo (`speech`)
  y a su izquierda la **carta**: suministro ya sumado (`delivered`, solo envíos), **foto real** sin repetir, párrafo de cuento (`message`, cambia de tono
  si alguna barra < 35 o hay averías) y línea de datos (`photoFactLine`).
  **Envío de Houston:** 1º la transmisión → botón "¡HAY UN CONTENEDOR EXTRA DENTRO! → ABRIR CAJA DE SUMINISTROS" → 2º la Cápsula Orbital (CS:GO, tirada gratis).
  Store: `fieldNote` (`photoId` puede ser null si la NASA no respondió), `unlockedPhotoIds`, `lastFieldNoteSol`, `dismissFieldNote()`. Las fotos forman el **álbum** del Periscopio.
- **Sistemas e Inventario** (panel centrado, apilado en vertical): arriba la franja de **averías activas** con botones **"Reparar Averías"**;
  debajo el inventario en cuadrícula compacta (`grid-cols-2 sm:3 md:4 lg:6`) con icono, nombre, efecto e interruptor/USAR; desglose a todo el ancho.
  El Enlace Houston es un panel **centrado en la pantalla** (sección **"Pedir Suministros"**, con pedidos restantes y envíos en camino).
- **Trivia por dificultad** (`MISSION_PROFILES`): 60 s en ambos modos; Explorador (fácil) muestra **2 respuestas** (la correcta + 1 al azar), Comandante 4 (`answerOptions`).
- **Pantalla final:** columnas a la misma altura (Insignias e Informe con `flex-1`). En derrota, recuadro **"Análisis de la evacuación"** (`defeatAnalysis`): qué falló / qué mejorar, máx. 3 puntos cada uno.
- **Fase 1 · Manifiesto de Carga** (`Phase1Summary`): marcador (aciertos, preparación de la base espacial, rango), aciertos por sistema, cuadrícula de
  suministros (`grid-cols-2 sm:3 md:4`) y franja de diagnóstico de averías antes del botón de entrar a la base espacial.
- **Debriefing final** (`GameOverScreen`): cabecera `ARES-IV // DEBRIEFING` con el emblema y el estado de Leo, Vega y Max; columnas equilibradas
  (izquierda: rango, instrumentos, insignias · derecha: informe y suministros). El informe se acorta a su primera frase + puntos de ciencia
  (`shortReport`) y solo se listan los objetos que SÍ entraron en la base espacial.

## 11. Minijuegos de reparación (SOLO para averías)
- El ciclo de cada Sol es el original: desgaste, radiación, complicaciones y el dilema diario con trade-offs ocurren **siempre**, sin minijuego previo.
- Los minijuegos (`minigames/EmergencyMinigameModal.tsx`) solo se abren con el botón **Reparar** del panel izquierdo, en:
  - una **complicación** de la Fase 1 (`RepairTarget { type: 'complication' }`), o
  - una **avería puntual** de máquina (`brokenMachines`; al empezar cada Sol desde el 2, `BREAKDOWN_CHANCE` = 20 %, máx. 1 a la vez).
- **5 minijuegos** (`MinigameKind`): `cables` (10 s) · `dust` paneles (9 s) · `radio` ondas (12 s) · `leak` tapar fugas con Cinta Kapton (9 s, 5 grietas)
  · `debris` destruir rocas en el radar (9 s, 6 rocas; las que llegan a la base vuelven a entrar). Los 2 nuevos están en `minigames/QuickGames.tsx`.
- **Rotación real** (`pickMinigame(vital, last)`): 60 % uno que encaje con el sistema (`MINIGAME_OPTIONS_FOR_VITAL`), 40 % cualquiera; **nunca el último**.
  Botón **"Cambiar prueba"** en el modal (`onSwitch`) para cambiar a otro sin penalización.
- `repairResult(target, true)`: quita la complicación o la avería y vuelve a encender sus máquinas (insignia "Mecánico de Ares-IV").
  `repairResult(target, false)`: sigue averiada ese Sol, −5 Energía, 1 intento por avería y Sol (`repairTried`).
- Cada minijuego muestra en su cabecera la telemetría/dato real (llamarada DONKI, InSight/Perseverance, distancia y retraso DSN, presión de Marte, basura espacial de la ISS).
- Radio: 12 s, margen ±20 %, basta 1,2 s acumulados y el progreso baja despacio al salirse (no se reinicia).
- **Cápsula Orbital en la base espacial: SOLO al aterrizar un envío de Houston** (se abre sola con `initialKind="houston"` + `autoSpin`). No hay botón libre en la cabecera.
  En la Fase 1 solo aparece el giro de rescate (`emergency`) del resumen.

## 12. Criterios del reto: glosario y verificación científica
- **Glosario contextual** (`data/glossary.ts` + `KidTooltip`): tooltips para niños al pasar el ratón (o enfocar/tocar) en `SOL X/10`,
  `ALERTA RADIACIÓN` (radiación y CME + la llamarada real de DONKI), los 5 velocímetros y Ciencia. Términos: Sol, radiación/CME, llamarada, microgravedad.
- **"Datos Abiertos NASA Utilizados"** (`NasaDataSourcesModal`, botón en el Periscopio; la portada ya no lo muestra): los 3 datasets reales, su estado en la sesión
  (`LIVE API` / `CURATED ARCHIVE`), qué mecánica alimentan, dónde están en el código y enlaces oficiales comprobados:
  1. **NASA DONKI** (endpoint FLR) → radiación, blindaje, alertas, minijuego de cables, eventos de Gemini. Cadena en vivo: api.nasa.gov 90 días
     (si no hay llamaradas, mayo-oct 2024) → servicio web CCMC → espejo **NOAA SWPC/GOES** (etiquetado como NOAA en `provider`) → archivo curado.
     Caché `sessionStorage` (`nasa-donki-flare-v2`). Con `DEMO_KEY` el cupo es mínimo: usad una clave gratuita propia en `VITE_NASA_API_KEY`.
  2. **NASA OSDR / GeneLab** → invernadero, soporte vital, dilemas biológicos. `fetchOsdrStudyMeta()` consulta en vivo la búsqueda de OSDR
     (estudios de Arabidopsis en el espacio: ID OSD, título, organismo, misión). OSDR solo permite CORS a su dominio, así que va por `/api/osdr`:
     proxy de `vite.config.ts` en dev/preview y Cloudflare Function `functions/api/osdr/[[path]].ts` en producción. Caché `nasa-osdr-study-v1`.
  3. **NASA Image and Video Library** (en vivo con respaldo local en `public/mars/`) → transmisiones con foto real y álbum del Periscopio.
  Si se conecta un dataset nuevo, añádelo aquí y en la ficha: la ciencia del juego debe ser rastreable por los jueces.

## 13. Documentación para el jurado
- [`DOCS_ARQUITECTURA.md`](./DOCS_ARQUITECTURA.md): documentación funcional (historia, objetivo STEM, flujo y mecánicas) y técnica (stack, carpetas, APIs NASA, Gemini, seguridad, responsive).
- [`PITCH_SCRIPT.md`](./PITCH_SCRIPT.md): guion de 4 min 30 s para 4 ponentes + chuleta de preguntas del jurado.
Si cambias una mecánica o un texto visible que aparece en estos documentos, actualízalos también.

## 14. Portada y terminología
- **Portada** (`MenuScreen`): `h-dvh` sin scroll a 100 % de zoom; tamaños con `clamp(..., min(vw, dvh), ...)` para que escale también con el ALTO. Solo emblema, título, botón COMENZAR MISIÓN, A.R.I.A. y la terminal de órdenes (sin píldoras de estado ni de datos).
- **Terminología:** en textos visibles, prompts de Gemini y documentación se dice **"base espacial"** (femenino: "la base espacial", "a la base espacial"), nunca "búnker". Los identificadores de código (`Phase2Bunker`, `bunkerInventory`, `sealBunker`...) no se renombran para no romper otras ramas.
- **Pantallas que deben caber al 100 % de zoom incluso en ~1100×540** (portátil con escalado de Windows al 125-150 %): terminal de decisión (`max-h-[min(85dvh,…)]`, sin altura mínima fija), `ArrivalTransmission` (md+: foto a la izquierda y texto a la derecha; el botón de acción va FUERA de la zona con scroll) y la Cápsula Orbital. Velocímetros de la cabecera: `w-[clamp(64px,min(11vw,15dvh),140px)]`. Para comprobarlo: `#qa-bunker-decision`, `#qa-transmission`, `#qa-capsule`.
- **Resumen post-quiz** (`Phase1Summary`): SIN avance automático; solo se entra a la base con el botón "ENTRAR A LA BASE ESPACIAL".
- **Selector de modo** (`MissionSelector`, `#qa-selector`): credenciales ilustradas (casco de cadete / insignia de comandante, SVG propios), medidor de reto (estrellas + barras), datos reales de cada perfil (`answerOptions`, reservas, averías) y fondo animado (órbitas, estrellas, cohete, base en Marte). Botón INICIAR MISIÓN en una barra fija abajo. Excepción a la paleta monocromática del Menú: aquí se usa naranja para dar un toque infantil.
