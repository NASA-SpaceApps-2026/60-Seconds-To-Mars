# 60 Seconds to Mars: The Solar Storm Protocol — Documento explicativo y arquitectura

> Juego web educativo para el reto **"Build a Junior Astronaut Mission Trainer"** del **NASA Space Apps Challenge**.
> Público: niños y niñas de **7 a 12 años**. Idioma: **español**.
> Contrato técnico detallado para el equipo y los agentes de IA: [`CLAUDE.md`](./CLAUDE.md). Flujo de trabajo en Git: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 1. Resumen del proyecto

**60 Seconds to Mars** es un juego web educativo en español para niños y niñas de
7 a 12 años. Simula la gestión de una base marciana durante una tormenta solar:
el jugador debe aprender ciencia, priorizar suministros y tomar decisiones con
costes reales antes de que las barras vitales se agoten.

El proyecto responde al reto **Build a Junior Astronaut Mission Trainer** del
NASA Space Apps Challenge. La experiencia dura aproximadamente 10-12 minutos,
funciona como aplicación web responsive y puede jugarse incluso si las APIs
externas no están disponibles.

## 2. Historia y objetivo pedagógico

### 2.1 La historia
Año **2038**, base **Ares-IV** en el **Cráter Jezero** de Marte (donde explora hoy el rover Perseverance).
Los astronautas adultos salen en el rover a explorar a 40 km y una **tormenta solar real** —detectada por **NASA DONKI**— les corta el camino de vuelta.
En el hábitat se quedan solos los tres **cadetes junior**: **Leo** (comandante), **Vega** (botánica) y **Max** (ingeniero), con la ayuda de la IA de a bordo **A.R.I.A.**
Tienen que **sobrevivir 10 Soles** (días marcianos) hasta que vuelva el rover de rescate de la **Comandante Elena**.

### 2.2 Objetivo pedagógico (STEM, 7-12 años)
| Competencia | Cómo se trabaja en el juego |
|---|---|
| **Conocimiento científico** | 45 preguntas sobre oxígeno, energía, comida, radiación y salud en el espacio; "Dato Real NASA" en cada evento; glosario (Sol, radiación/CME, llamarada, microgravedad). |
| **Pensamiento sistémico** | 5 barras vitales conectadas: encender una máquina gasta energía, la radiación baja el blindaje y eso afecta a la salud. |
| **Toma de decisiones con *trade-offs*** | Ninguna decisión diaria es gratis: siempre hay un coste de ingeniería. |
| **Planificación y anticipación** | Los envíos de Houston tardan 2 Soles (retraso real Tierra-Marte): hay que pedir antes de que la barra llegue a cero. |
| **Ciencia real y verificable** | Datos en vivo de NASA DONKI, NASA OSDR/GeneLab y fotos reales de Perseverance (NASA Image Library), con ficha de fuentes para jueces y docentes. |
| **Resiliencia** | Si una barra llega a cero no hay "game over" dramático: hay **evacuación médica a la órbita** y un informe para aprender. |

## 3. Flujo completo de una partida
1. **Menú** → estado en vivo de NASA DONKI y Gemini, las 4 fases del juego y el botón **Datos Abiertos NASA Utilizados**.
2. **Prólogo en viñetas** (saltable): el rover se va, el satélite SOHO detecta la llamarada (clase real de DONKI), la consola se bloquea.
3. **FASE 01 · Protocolo de Desbloqueo (60 s)**
   - Trivia contrarreloj con dificultad progresiva. Cada acierto manda un objeto **de esa rama** al búnker (fácil → común, difícil → épico/legendario).
   - Una rama sin aciertos provoca una **avería inicial** (−20 al empezar, −4 por Sol y sus máquinas apagadas).
   - **Manifiesto de Carga**: aciertos, preparación del búnker, rango, suministros asegurados y diagnóstico de averías. Si fue muy mal, **Cápsula de rescate gratis**.
4. **Viñeta de cierre de compuertas** → empieza el búnker.
5. **FASE 02 · Gestión del Búnker (10 Soles)** — escena exterior *point-and-click* del hábitat Ares-IV en Jezero:
   - **Casa** → Sistemas e Inventario (encender/apagar máquinas, usar consumibles, reparar).
   - **Antena** → Enlace Houston: pedir suministros (−10 Energía, llegan en 2 Soles).
   - **Robot A.R.I.A.** → preguntas a la IA ("¿Cuál es el mayor peligro hoy?").
   - **Resolver Misión Sol N** → el ordenador muestra el dilema del día (generado por Gemini a partir de la llamarada real) con su **Dato Real NASA** y 3 decisiones con costes.
   - Al acabar el Sol se aplican desgaste, radiación (según la clase DONKI), máquinas y cosechas.
6. **FASE 03 · Mantenimiento y Reparación** — si un sistema falla (avería inicial o avería puntual del 20 % por Sol), **5 minijuegos** en rotación: cables del escudo, polvo de paneles solares, sintonía de radio, fugas de oxígeno y basura espacial en el radar.
7. **Transmisiones con foto real**: cuando aterriza un envío de Houston (y cada 2-3 Soles), la Comandante Elena entrega una carta con una **foto real de Marte**; después se abre el **contenedor extra** (carrusel tipo *case opening*). Las fotos forman un álbum en el **Periscopio**.
8. **Viñetas de radio** en los Soles 4 y 8 (el rover se acerca).
9. **FASE 04 · Rescate** — al resolver el Sol 10: **Finalizar misión final** → **Debriefing**: estado de Leo, Vega y Max, rango, instrumentos, insignias, informe de ingeniería (Gemini) y suministros.

### 3.1 Mecánicas principales
- **5 barras vitales** (0-100): Oxígeno, Energía, Comida, Blindaje y Salud. Si cualquiera llega a 0 → evacuación.
- **Desgaste base por Sol**: O2 −14, Comida −14, Energía −3. Con el búnker vacío se aguanta unos 3-4 Soles: hace falta estrategia.
- **Radiación** según la llamarada real: baja 4 / moderada 7 / alta 11 / extrema 16 de Blindaje por Sol (la Manta de Plomo la divide entre 2).
- **Ciencia**: puntos que se envían a la Tierra; cuentan para el rango final.
- **Insignias**: Ingeniero Solar, Botánico GeneLab, Mecánico de Ares-IV, Comunicador Deep Space y Héroe de Ares-IV.
- **Cápsula de Salvación**: permite intercambiar energía, ciencia, comida o chatarra
  por suministros. En la Fase 1 solo se habilita el giro de emergencia; en la
  Fase 2 la cápsula se abre al recibir un envío de Houston.
- **Historia y transmisiones**: las viñetas del prólogo, las comunicaciones de
  los Soles 4 y 8 y las fotos de Marte convierten el progreso técnico en una
  historia comprensible para el público infantil.

## 4. Arquitectura técnica

### 4.1 Stack
| Capa | Tecnología |
|---|---|
| Interfaz | **React 19** + **TypeScript 7** (`strict`) |
| Build | **Vite 8** |
| Estilos | **Tailwind CSS 4** (tokens `nasa-blue` #0B3D91 / `nasa-red` #FC3D21), diseño responsive con `clamp()`, `dvh` y breakpoints `sm/md/lg/xl` |
| Animación | **Framer Motion** |
| Estado | **Zustand 5** (un único store con toda la matemática del juego) |
| Iconos | **lucide-react** (cero emojis en el código) |
| IA | **Google Gemini** (`@google/genai`) con salida JSON validada |
| Audio | `speechSynthesis` (voz) + **Web Audio API** (efectos sintetizados, cero archivos de audio) |
| Backend ligero | **Cloudflare Pages Functions** (proxies de Gemini y OSDR) |
| Calidad | GitHub Actions: `npm ci` + `npm run build` en cada push y PR a `main`/`develop` |

### 4.2 Organización del código
```
functions/api/
├── gemini.ts                 Proxy de Gemini (la clave vive solo en el servidor)
└── osdr/[[path]].ts          Proxy de solo lectura a la API de NASA OSDR (CORS)
public/mars/                  4 fotos reales de Perseverance (respaldo local) + CREDITS.txt
src/
├── types/game.ts             Contrato de datos (tipos compartidos)
├── store/useGameStore.ts     ÚNICO store Zustand: fases, Soles, reparaciones, Houston, insignias...
├── services/
│   ├── nasaApi.ts            NASA DONKI (llamaradas), NASA OSDR (estudios), NASA Image Library (fotos)
│   ├── geminiGameMaster.ts   Eventos diarios, debriefing y chat de A.R.I.A. (validación + respaldo)
│   └── geminiSchemas.ts      Esquemas JSON + instrucción de sistema infantil (compartido con functions/)
├── data/                     Objetos (30), preguntas (45), premios, fases, glosario, notas de campo...
├── components/
│   ├── MenuScreen.tsx         Portada y 4 fases
│   ├── phase1/                Trivia (Phase1Quiz) y Manifiesto de Carga (Phase1Summary)
│   ├── Phase2Bunker.tsx       Búnker: barra superior, escena, paneles y ordenador de misión
│   ├── BunkerDiorama.tsx      Escena SVG del Cráter Jezero y el hábitat (solo visual, por props)
│   ├── minigames/             5 minijuegos de reparación
│   ├── SalvageRouletteModal   Cápsula Orbital (carrusel tipo case opening)
│   ├── ArrivalTransmission    Comandante Elena + carta con foto real
│   ├── StoryComicModal        Viñetas de historia
│   ├── PeriscopeModal         Telemetría de Jezero, álbum de fotos e insignias
│   ├── NasaDataSourcesModal   Ficha "Datos Abiertos NASA Utilizados" (para jueces)
│   └── GameOverScreen.tsx     Debriefing final
└── utils/                    Sonido, voz, efemérides Tierra-Marte, atajos de QA (solo dev)
```

### 4.3 Flujo de datos y estado

La aplicación tiene un único estado global en
[`src/store/useGameStore.ts`](./src/store/useGameStore.ts). Los componentes
presentan la información y emiten acciones; no duplican la matemática del juego.
Las funciones puras del store calculan inventario, balance energético, desgaste,
radiación, cosechas, salud, rango y condición de evacuación.

```text
App
 ├─ MenuScreen
 ├─ Phase1Scavenge
 │   ├─ Phase1Quiz
 │   └─ Phase1Summary
 ├─ Phase2Bunker
 │   ├─ BunkerDiorama (presentación SVG por props)
 │   ├─ sistemas / Houston / A.R.I.A. / decisiones
 │   └─ minijuegos de reparación
 └─ GameOverScreen

useGameStore
 ├─ fase, Sol, vitales, inventario, máquinas y eventos
 ├─ NASA DONKI / OSDR / fotos
 ├─ pedidos de Houston, historia, insignias y álbum
 └─ acciones y funciones puras de equilibrio
```

`App.tsx` carga las pantallas grandes bajo demanda mediante `lazy` y `Suspense`.
Cada pantalla está protegida por `ScreenErrorBoundary`, que ofrece reintento o
regreso al menú. El estado de la partida no se guarda en `useState`; solo se
mantiene estado local de interfaz, como animaciones y modales.

### 4.4 Integración con datos reales de la NASA
Todos los servicios **nunca lanzan errores**: si una fuente falla, el juego sigue con un respaldo real y lo indica en la ficha de datos.

| Fuente | Endpoint | Qué aporta al juego | Respaldo |
|---|---|---|---|
| **NASA DONKI** (Space Weather) | `api.nasa.gov/DONKI/FLR` (90 días; si no hay, mayo-oct 2024) → servicio web CCMC | Clase de la llamarada → intensidad de radiación, alertas, auroras, minijuego de cables y contexto de los eventos de Gemini | Espejo en vivo **NOAA SWPC/GOES** (etiquetado como NOAA) → 4 llamaradas reales archivadas. Caché en `sessionStorage`. |
| **NASA OSDR / GeneLab** | Búsqueda pública de OSDR (estudios de *Arabidopsis* en el espacio) vía `/api/osdr` | ID oficial del estudio, título, organismo y misión, mostrados en la ficha de verificación; datos de Veggie VEG-01 y GeneLab en objetos y eventos | Estudio curado OSD-7 (STS-129). Caché en `sessionStorage`. |
| **NASA Image and Video Library** | `images-api.nasa.gov/search?q=Perseverance Mars Jezero` | Fotos reales de Perseverance en las transmisiones y el álbum del Periscopio (filtra ilustraciones y mapas; resumen en español) | 4 fotos reales en `public/mars/` (también si una imagen remota no carga). |
| **Efemérides** | Cálculo orbital local (`utils/marsEphemeris.ts`) | Distancia Tierra-Marte de hoy y retraso de la señal (Deep Space Network) | — |

### 4.5 Integración con Gemini (IA generativa)
- **Usos**: dilema diario de cada Sol, informe de ingeniería final, prueba de
  conexión y chat con A.R.I.A.
- **Transporte híbrido**: `POST /api/gemini` (Cloudflare Function) → en desarrollo, SDK directo → si todo falla, **eventos de respaldo** escritos con datos NASA citados.
- **Salida estructurada**: el servidor fija el modelo, el esquema JSON y la instrucción de sistema.
- **Validador obligatorio** (`ensurePlayable`): efectos recortados a [−35, +35], siempre al menos una opción jugable, *trade-off* obligatorio y filtro de palabras no aptas.
- **Guardarraíl infantil**: nunca se habla de muerte; se usa "evacuación médica a la órbita" o "fatiga espacial".

### 4.6 Arquitectura de seguridad y resiliencia
- **Claves fuera del código**: `.env.local` y `.dev.vars` están en `.gitignore`; `.env.example` solo tiene valores vacíos.
- **La clave de Gemini nunca llega al navegador en producción**: solo se lee si `import.meta.env.DEV`; en producción todo pasa por `/api/gemini`.
- **Proxies mínimos**: la función de OSDR solo acepta GET, una ruta y parámetros en lista blanca; la de Gemini comprueba el origen, el tipo de tarea y el tamaño del prompt.
- **Auditoría antes de cada commit**: búsqueda de claves en el contenido preparado y en `dist/`.
- **Ramas protegidas** en GitHub: `main` y `develop` solo por Pull Request con la CI en verde.
- **Contenido para niños**: validación de todo lo que devuelve el LLM y textos de respaldo revisados.
- **Pantalla estable**: los servicios de NASA y Gemini capturan sus propios
  errores, devuelven un resultado de respaldo y muestran si el dato está en
  estado `LIVE API` o `FALLBACK`.

### 4.7 Reglas de validación de eventos

Antes de que un evento generado por Gemini llegue a la interfaz:

1. Se limita el tamaño de los textos y se eliminan caracteres de control.
2. Se filtran términos no adecuados para el público infantil.
3. Cada efecto de una barra se recorta a `[-35, +35]` y ciencia a `[-20, +50]`.
4. Se garantiza que exista al menos una opción seleccionable con el inventario actual.
5. Si una opción no tiene ningún coste negativo, se añade un coste de energía u oxígeno.
6. `applyEffects` vuelve a limitar las barras al intervalo `[0, 100]`.

Así se evita que una respuesta inesperada del modelo deje al jugador sin opciones
o rompa el equilibrio de la partida.

### 4.8 Diseño visual y responsive
- Tipografía base fluida: `font-size: clamp(15px, 0.35vw + 11px, 18px)`; todos los tamaños en `rem`.
- Alturas con `dvh` (alto visible real, también en móviles).
- El diseño sigue la estética **NASA White**, usa el emblema original de Ares-IV
  y no utiliza el logotipo oficial de NASA.
- La interfaz se revisa en **1280×720**, **1366×768** y móvil, sin zoom artificial.
  Los paneles internos usan scroll cuando el contenido no cabe.

## 5. Puesta en marcha y despliegue
```bash
git clone https://github.com/YerayEspinosaEsteban/60-seconds-to-mars.git
cd 60-seconds-to-mars
cp .env.example .env.local          # opcional: claves de Gemini y de api.nasa.gov
npm install && npm run dev
```
- Sin claves el juego funciona igual (respaldos). Con una clave gratuita de [api.nasa.gov](https://api.nasa.gov) DONKI no se queda sin cupo.
- Atajos de revisión (solo en desarrollo): `#qa-quiz`, `#qa-summary`, `#qa-bunker`, `#qa-bunker-systems`, `#qa-bunker-decision`, `#qa-gameover`.
- Producción: Cloudflare Pages con `GEMINI_API_KEY` y `GEMINI_MODEL` como secretos.

### 5.1 Validación antes de entregar

```bash
npm install
npm run build
```

`npm run build` ejecuta la comprobación de TypeScript y genera el build de Vite.
La integración continua repite este paso con `npm ci` en cada push y Pull Request.

## 6. Decisiones técnicas relevantes

- **Zustand único**: evita que las reglas de supervivencia se dispersen entre
  componentes y permite reproducir cada transición de la partida.
- **Servicios con fallback**: la conexión es una mejora, no un requisito para
  jugar. El valor educativo se conserva sin internet.
- **Funciones de servidor**: protegen la clave de Gemini y permiten controlar
  modelo, esquema y directivas desde un único punto.
- **SVG por props en el diorama**: separa la escena visual de la lógica del
  juego y facilita añadir accesibilidad y pruebas de interacción.
- **Minijuegos solo para averías**: mantienen el ritmo de la gestión diaria y
  hacen que reparar tenga un propósito claro, en lugar de interrumpir cada Sol.

## 7. Fuentes y documentación relacionada

- [Contrato técnico para el equipo](./CLAUDE.md)
- [Guion de presentación](./PITCH_SCRIPT.md)
- [Guía de contribución](./CONTRIBUTING.md)
- [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
- [NASA OSDR / GeneLab](https://science.nasa.gov/biological-physical/data/osdr/)
- [NASA Image and Video Library](https://images.nasa.gov/)
