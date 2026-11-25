# 🚀 60 Seconds to Mars: The Solar Storm Protocol

Juego web educativo para niños y niñas de **7 a 12 años** · NASA Space Apps Challenge — *Build a Junior Astronaut Mission Trainer*.

🎮 **Juega aquí:** https://60-seconds-to-mars.pages.dev/

¡Una tormenta solar real (datos de **NASA DONKI**) viaja hacia Marte! Tienes **60 segundos** para meter lo más importante en una base espacial de **12 huecos** y después sobrevivir **10 Soles** equilibrando oxígeno, energía, comida, blindaje y salud. Cada objeto y cada dilema incluye ciencia real de **NASA OSDR**. Un Director de Juego con **Google Gemini** crea los retos de cada día (y si no hay IA, el juego sigue con eventos de respaldo).

---

## ⚡ Arranque rápido (5 minutos)

Requisitos: **Node.js 20+** y **Git**.

```bash
git clone <URL-DEL-REPO>
cd <carpeta-del-repo>
npm install
```

Crea tu archivo de claves **local** (nunca se sube a Git):

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local
# macOS / Linux
cp .env.example .env.local
```

Abre `.env.local` y pon tu clave de Gemini (consíguela gratis en https://aistudio.google.com/apikey):

```env
VITE_GEMINI_API_KEY=tu_clave_aqui
VITE_NASA_API_KEY=DEMO_KEY
VITE_GEMINI_MODEL=gemini-3.5-flash
```

> Sin clave el juego funciona igual en **modo Fallback** (10 eventos de respaldo con datos reales de la NASA).

```bash
npm run dev
```

Abre **http://localhost:5173**. Arriba del menú verás el diagnóstico:
- `🟢 NASA DONKI: Conectado` / `🟡 Fallback (archivo real)`
- `🟢 Gemini: Online` / `🟡 Gemini: Fallback offline` + motivo, y el botón **🤖 Test Gemini API**.

## 🎮 Cómo probar

| Qué | Cómo |
|---|---|
| Fase 1 | Botón **INICIAR PROTOCOLO DE EMERGENCIA** → pestañas Invernadero/Laboratorio/Almacén → toca objetos para cargarlos (toca de nuevo para sacarlos). Si no cabe, la esclusa tiembla. **¡SELLAR COMPUERTAS YA!** o espera a 0 s. |
| Fase 2 directa | Escribe o di **supervivencia** en la terminal de A.R.I.A. del menú (o teclea la palabra en cualquier pantalla). |
| Pantalla final | Orden **final** (victoria) o **derrota** (evacuación con análisis de fallos). |
| Trade-offs | Apaga/enciende máquinas en el Panel de Ingeniería y mira la previsión "mañana" de cada barra. |
| Bloqueos | Las opciones que necesitan un objeto que dejaste fuera salen con 🔒. |
| Base espacial vacía | Sella sin coger nada: la evacuación llega hacia el Sol 3-4. |

## 🛠️ Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación TypeScript + build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |

## 🔐 Seguridad de claves

- `.env.local` y `.dev.vars` están en `.gitignore` → **nunca** se suben.
- La clave `VITE_GEMINI_API_KEY` **solo se usa en `npm run dev`**. En el build de producción se elimina; el juego usa el proxy `/api/gemini`.
- Antes de hacer push, comprueba: `git status` **no** debe listar `.env.local` ni `.dev.vars`.
- Si alguna vez subes una clave por error: **revócala** en Google AI Studio y crea otra (borrarla del repo no basta).

## ☁️ Despliegue en Cloudflare Pages (clave oculta de verdad)

1. Sube el repo a GitHub.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build command: `npm run build` · Output directory: `dist`.
4. **Settings → Variables and Secrets** → añade como *Secret*: `GEMINI_API_KEY` (y opcional `GEMINI_MODEL=gemini-3.5-flash`).
5. Cloudflare detecta `functions/api/gemini.ts` automáticamente → endpoint `/api/gemini`.

Probar el proxy en local:
```bash
Copy-Item .dev.vars.example .dev.vars   # y pon tu GEMINI_API_KEY
npm run build
npx wrangler pages dev dist
```

## 🗂️ Estructura

```
functions/api/gemini.ts         Proxy seguro de Gemini (Cloudflare Pages Function)
src/types/game.ts               Contrato de tipos
src/data/                       Objetos de la base + datos NASA de respaldo
src/services/                   NASA DONKI, Gemini (híbrido + validación), esquemas
src/utils/                      Sonido (Web Audio) y voz de A.R.I.A. (speechSynthesis)
src/store/useGameStore.ts       Estado global Zustand + matemática del juego
src/components/                 Pantallas
```

## 🤝 Trabajo en equipo

1. Lee **[CLAUDE.md](./CLAUDE.md)**: es el contrato técnico (tipos, acciones, reglas). Los agentes de IA lo leen automáticamente.
2. Trabaja en ramas: `git checkout -b feature/mi-cambio`.
3. Antes de PR: `npm run build` sin errores.
4. No renombres tipos ni acciones del store sin avisar al equipo.

## 📚 Fuentes NASA
NASA DONKI (Space Weather Database) · NASA OSDR / GeneLab · ISS ECLSS · Experimento Veggie · Curiosity RAD/REMS · Perseverance MOXIE · MAVEN · Deep Space Network · Apolo 13.
