# Guion de presentación — 60 Seconds to Mars: The Solar Storm Protocol

**Duración total:** unos 4 min 30 s (cabe entre 3 y 5 minutos).
**Formato:** 4 ponentes. Frases cortas, fáciles de memorizar. Lo que va entre [corchetes] es lo que se hace o se enseña en pantalla, no se dice.

> **Antes de empezar:** juego abierto en la portada, a pantalla completa, con internet (para que DONKI, OSDR y las fotos salgan en vivo).
> Tened una partida de respaldo preparada con el atajo de desarrollo `#qa-bunker` por si falla algo en directo.

---

## Persona 1 · Gancho e historia (0:00 – 0:55)

[Portada en pantalla. Señalad la pastilla "NASA DONKI · Llamarada…".]

> "Imaginad que tenéis 10 años y estáis en Marte.
> Los adultos se han ido de expedición con el rover… y justo entonces el Sol lanza una llamarada gigante.
> Esto no es inventado: esta llamarada que veis aquí arriba la está midiendo **ahora mismo** la NASA, en su base de datos DONKI."

> "Así empieza **60 Seconds to Mars**. Un juego para niños de 7 a 12 años en el que Leo, Vega y Max, tres cadetes, tienen que sobrevivir **10 días marcianos**, que se llaman *Soles*, hasta que llegue el rescate."

> "Nuestro reto era crear un entrenador de misiones para jóvenes astronautas.
> Y pensamos: la mejor forma de aprender ciencia espacial no es leerla… **es tener que usarla para salvar a tu tripulación**."

[Pulsad **INICIAR PROTOCOLO DE EMERGENCIA** y pasad rápido el prólogo en viñetas.]

---

## Persona 2 · Demo jugable: Fase 1 y base espacial (0:55 – 2:15)

[Pantalla de trivia.]

> "Fase 1: tenemos **60 segundos** para desbloquear los suministros respondiendo preguntas espaciales.
> Cada acierto mete un objeto real de la NASA en la base espacial: tanques de oxígeno, el generador MOXIE, semillas del experimento Veggie…
> Pero si fallas todas las preguntas de un sistema, ese sistema empieza **averiado**."

[Responded 3-4 preguntas en directo y enseñad el **Manifiesto de Carga**.]

> "Aquí vemos el manifiesto: cuántos aciertos, cómo de preparado está la base espacial y qué averías tenemos."

[Entrad a la base espacial. Señalad la escena.]

> "Fase 2: la base espacial. Todo se controla tocando la escena.
> La **casa** abre los sistemas: encender o apagar máquinas gasta energía.
> La **antena** pide suministros a Houston… pero tardan **2 Soles** en llegar, porque Marte está a millones de kilómetros. Hay que **anticiparse**."

[Pulsad **Resolver Misión Sol 1** y elegid una opción.]

> "Cada día hay un dilema. Y aquí está la clave pedagógica: **ninguna decisión es gratis**. Proteger el escudo gasta energía; ahorrar energía pone en riesgo el oxígeno. Igual que en una misión de verdad."

[Si da tiempo: abrid una reparación y jugad 5 segundos de un minijuego.]

> "Y cuando algo se rompe, toca repararlo con minijuegos rápidos: reconectar cables, limpiar polvo de los paneles como le pasó al módulo InSight, o tapar fugas de oxígeno."

---

## Persona 3 · Ciencia real de la NASA e IA (2:15 – 3:25)

[Abrid el **Periscopio** y luego **Datos Abiertos NASA Utilizados**.]

> "Todo lo que habéis visto está conectado a **datos reales y verificables** de la NASA. Usamos tres fuentes en vivo:"

> "**Uno: NASA DONKI.** La llamarada solar real decide cuánta radiación recibe la base espacial cada día. Más fuerte la llamarada, más se desgasta el escudo."

> "**Dos: NASA OSDR y GeneLab.** Consultamos en directo estudios reales de biología espacial, como plantas *Arabidopsis* cultivadas en la Estación Espacial. Por eso el invernadero del juego funciona como funciona."

> "**Tres: la NASA Image Library.** Cuando llega un envío de Houston, la Comandante Elena nos manda una **foto real** de Marte hecha por el rover Perseverance en el Cráter Jezero, justo donde está nuestra base."

[Señalad las chapas **LIVE API** en verde.]

> "Los jueces podéis comprobarlo aquí mismo: cada fuente dice si está en vivo, qué parte del juego alimenta y su enlace oficial."

> "Y para que cada partida sea distinta usamos **Gemini**: escribe el dilema de cada día a partir de la llamarada real, y A.R.I.A. responde dudas de los niños. Pero siempre pasa por nuestro validador: nada de contenido inapropiado y nunca una decisión gratis."

---

## Persona 4 · Arquitectura técnica, seguridad e impacto (3:25 – 4:30)

[Dejad en pantalla el **Debriefing** final o la ficha de datos.]

> "Por dentro: **React 19 con TypeScript estricto**, **Zustand** como único cerebro del juego, **Tailwind** para que funcione igual en un portátil del cole que en una tablet, y **Framer Motion** para las animaciones. Cero archivos de audio: los sonidos se sintetizan en el navegador."

> "Además, integramos las APIs de NASA y Gemini mediante funciones de **Cloudflare**, con datos de respaldo para que el juego siga funcionando sin conexión y con las claves protegidas fuera del navegador."

> "La seguridad era clave porque el público son niños.
> Las claves de la IA **nunca llegan al navegador**: pasan por funciones de servidor en Cloudflare.
> Y si internet falla, el juego **no se rompe nunca**: cada fuente tiene un respaldo real y te lo dice."

> "Trabajamos como un equipo profesional: ramas protegidas, revisión por Pull Request y una integración continua que impide subir código que no compila."

[Pausa. Mirad al jurado.]

> "¿El impacto? Un niño que termina esta partida sabe qué es un Sol, qué es una tormenta solar y por qué no se puede encender todo a la vez en una base marciana.
> Y lo más importante: ha visto **datos reales de la NASA** y ha tomado decisiones de ingeniero."

> "Eso es **60 Seconds to Mars**. Gracias. ¿Preguntas?"

---

## Chuleta para preguntas del jurado
| Pregunta probable | Quién responde | Respuesta corta |
|---|---|---|
| ¿Qué pasa si no hay internet? | Persona 4 | Funciona igual: 4 llamaradas reales archivadas, un estudio OSDR curado y 4 fotos reales guardadas. La ficha lo indica. |
| ¿Es seguro para niños? | Persona 3 | La IA tiene una instrucción infantil y un validador; nunca se habla de muerte, sino de "evacuación médica a la órbita". |
| ¿Cómo sabéis que los datos son reales? | Persona 3 | Ficha "Datos Abiertos NASA Utilizados": fuente, estado en vivo, endpoint y enlace oficial de cada una. |
| ¿Por qué 10 Soles? | Persona 1 | Una partida dura unos 12 minutos: cabe en una clase y obliga a planificar. |
| ¿Qué aprenden exactamente? | Persona 2 | Sistemas conectados, *trade-offs* de ingeniería, planificación con retraso de comunicaciones y vocabulario científico (glosario). |
| ¿Usáis el logo de la NASA? | Persona 4 | No: las normas lo restringen. Usamos un emblema propio de la misión Ares-IV. |
