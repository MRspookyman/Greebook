# Greenbook · Estilo

Diario de lectura cálido y legible: papel, portadas protagonistas y una barra flotante verde oscuro.
La interfaz sirve para registrar rápido; el adorno nunca compite con el dato.

## Legibilidad (reglas que no se negocian)

Basadas en Apple HIG, Material 3, WCAG 2.2 y USWDS.

- **Texto**: Inter 16 px con interlineado 1,5 para leer; 14 px para lo secundario; **mínimo 12 px** y solo
  en metadatos cortos (insignias, ejes, fechas).
- **Líneas largas** (notas, reseñas): 45–75 caracteres; nunca texto corrido a todo el ancho en tablet.
- **Mayúsculas** solo en etiquetas de una o dos palabras (`eyebrow`), con 0,08 em de espaciado.
- **Contraste**: texto ≥ 4,5:1; iconos, bordes de controles y marcas de gráficos ≥ 3:1.
- **Zonas táctiles**: ≥ 44 × 44 px aunque el dibujo sea más pequeño.
- **Una acción principal** (botón relleno) por pantalla; el resto en contorno o enlace.
- **Movimiento** con sentido y apagado con `prefers-reduced-motion`.

## Tipografía

- `font-sans` (Inter): toda la interfaz, botones, cifras de estadísticas (`.figure`, cifras proporcionales).
- `font-serif` (Fraunces): títulos de pantalla (`display`, 30 px), títulos de libro (`title`, 22 px) y cifras
  de lectura (página, cronómetro: `timer-digits`, `folio`).
- `hand` (Caveat): solo las palabras de la pareja (huellas y mensajes).
- Cifras alineadas (`tabular-nums`) solo en columnas y en el cronómetro.

## Color

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--bg` / `--surface` | #F7F3EA / #FFFDF8 | #1D231E / #252C25 | papel / tarjetas y hojas |
| `--ink` / `--muted` | #2B2A26 / #6D685E | #EEE8DA / #B0AA9E | texto principal / secundario |
| `--green` / `--blue` | #2E7B47 / #3B62C9 | #56A36B / #6C8FF0 | identidad de cada persona (marcas, barras) |
| `--chrome` | #1F3B31 | #0F1A15 | barra flotante |
| `--chrome-mark` | #D8B477 | #D8B477 | indicador activo de la barra |
| `--heat-1…5` | violeta claro → oscuro | violeta oscuro → claro | minutos leídos por día |
| `--rate-1…5` | latón claro → oscuro | latón oscuro → claro | nota de 1 a 5 estrellas |

El verde y el azul de identidad, la escala de minutos y la de notas están validados con el validador de
dataviz (separación para daltonismo y contraste sobre el fondo). No inventes colores nuevos para series:
usa estos tokens. El texto nunca lleva el color de una serie; la identidad la marca un punto o una barra.

## Componentes

- **Barra inferior** (`TabBar`): Hoy · Biblioteca · **Leer** · Estadísticas · Nosotros, flotante sobre el
  papel. El botón central abre la lectura; con el cronómetro en marcha se rellena y muestra el tiempo.
  Lo que se apoya en la barra usa `--tabbar-h`.
- **Portada** (`Cover`): tela generada si no hay imagen; `ribbon` marca la lectura actual; `badge` imprime
  en la esquina inferior derecha una pastilla blanca (`coverBadge`: «35 %», «★ 4,5», «✓», «p. 120»).
  La inicial de la pareja va en la esquina inferior izquierda (`cover-mark`).
- **Progreso** (`ProgressBar`): 6 px, extremos redondeados, pista del mismo color aclarado. Si se puede tocar,
  la zona táctil mide al menos 44 px de alto.
- **Cifras** (`StatFigure`): etiqueta corta + valor en `.figure` + unidad; dentro de un `<dl>`.
- **Pestañas internas** (`Segmented variant="underline"`): para partir pantallas largas en vistas.
- **Chips**: píldoras de 44 px; seleccionado = tinta sobre papel invertida.
- **Botones**: 12 px de radio; `btn-primary` relleno con el color de la persona; `btn-outline` con borde de 1,5 px.
- **Sello** (`SessionStamp`): la única celebración, al guardar una sesión.

## Movimiento

Tokens: `--dur-tap` 140 ms (presión), `--dur-move` 280 ms (indicadores), `--dur-fill` 760 ms (barras).
Entradas escalonadas con `.enter` y `--i`; números que ruedan (`RollingNumber`, `CountUp`); la portada se
agranda hacia la ficha del libro (View Transitions). Solo lo que está pasando ahora late (`live-dot`).

## Evitar

Texto por debajo de 12 px, párrafos en mayúsculas, más de un botón relleno, rejillas de tarjetas tipo
panel, degradados de fondo, colores de serie inventados, gráficos sin tabla alternativa y adornos que
obliguen a hacer scroll en Hoy.
