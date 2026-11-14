# Guion de presentación — 60 Seconds to Mars: The Solar Storm Protocol

**Duración total:** unos 2 min 45 s.
**Formato:** 4 ponentes. Frases cortas, fáciles de memorizar. Lo que va entre [corchetes] es lo que se hace o se enseña en pantalla, no se dice.

> **Antes de empezar:** juego abierto en la portada, a pantalla completa, con internet (para que DONKI, OSDR y las fotos salgan en vivo).
> Tened una partida de respaldo preparada con el atajo de desarrollo `#qa-bunker` por si falla algo en directo.

---

## Persona 1 · Gancho e historia (0:00 – 0:40)

[Portada en pantalla. Señalad la pastilla "NASA DONKI · Llamarada…".]

> "Imaginad que tenéis 10 años y estáis en Marte. Los adultos se han ido con
> el rover y, justo entonces, el Sol lanza una llamarada. Esta tormenta está
> basada en datos reales de NASA DONKI."

> "Así empieza **60 Seconds to Mars**: Leo, Vega y Max deben mantener con vida
> su base durante 10 días marcianos, llamados *Soles*, hasta que llegue el rescate."

> "Es un entrenador de misiones para niños de 7 a 12 años: aprender ciencia no
> consiste solo en leerla, sino en usarla para salvar a la tripulación."

[Pulsad **INICIAR PROTOCOLO DE EMERGENCIA** y pasad rápido el prólogo en viñetas.]

---

## Persona 2 · Demo: preparar el búnker (0:40 – 1:25)

[Pantalla de trivia.]

> "En la primera fase tenemos **60 segundos** para responder preguntas
> espaciales. Cada acierto añade un suministro al búnker: oxígeno, energía,
> comida o semillas del experimento Veggie. Si fallamos una rama, empieza averiada."

[Responded una pregunta y enseñad el **Manifiesto de Carga**.]

> "Aquí vemos los aciertos, los suministros conseguidos y las averías iniciales."

[Entrad al búnker. Señalad la escena.]

> "En la segunda fase controlamos el búnker desde la escena: la casa abre los
> sistemas y la antena pide suministros a Houston, que tardan **2 Soles** en llegar."

[Pulsad **Resolver Misión Sol 1** y elegid una opción.]

> "Cada Sol plantea un dilema: proteger el escudo gasta energía; ahorrar energía
> puede poner en riesgo el oxígeno. **Ninguna decisión es gratis**."

---

## Persona 3 · Ciencia e IA responsable (1:25 – 2:05)

[Abrid el **Periscopio** y luego **Datos Abiertos NASA Utilizados**.]

> "El juego está conectado a **datos reales y verificables** de la NASA."

> "DONKI determina la radiación; OSDR y GeneLab aportan estudios de biología
> espacial; y la NASA Image Library nos proporciona fotos reales de Marte."

> "Gemini crea dilemas distintos y A.R.I.A. responde preguntas, pero la salida
> pasa por un validador infantil: limita efectos, filtra contenido y garantiza
> que siempre exista una opción jugable."

> "Si internet falla, usamos respaldos reales. La conexión mejora la variedad,
> pero nunca bloquea la experiencia."

---

## Persona 4 · Arquitectura, seguridad y cierre (2:05 – 2:45)

[Dejad en pantalla el **Debriefing** final o la ficha de datos.]

> "Por dentro usamos **React 19, TypeScript estricto, Zustand y Tailwind**.
> Un único store contiene las reglas de supervivencia; las pantallas solo las
> presentan. El diseño funciona en portátil y tablet."

> "La seguridad es esencial: las claves de IA nunca llegan al navegador, pasan
> por funciones de servidor en Cloudflare. Y cada pantalla tiene recuperación
> ante errores."

> "El resultado es una experiencia en la que un niño aprende qué es un Sol, cómo
> afecta una tormenta solar y por qué no puede encenderlo todo a la vez."

> "Eso es **60 Seconds to Mars**: datos reales, decisiones de ingeniería y
> aprendizaje convertido en juego. Gracias. ¿Preguntas?"

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
| ¿Qué ocurre si una decisión generada por IA es problemática? | Persona 3 | No llega directamente al jugador: se valida, se sanea, se limita y, si no cumple, se sustituye por un evento seguro de respaldo. |
| ¿Qué diferencia hay entre aprender y jugar? | Persona 2 | Cada pregunta y cada dilema cambia el estado del búnker; el conocimiento se convierte inmediatamente en una decisión de ingeniería. |
