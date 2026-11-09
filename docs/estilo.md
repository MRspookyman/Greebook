# Greenbook · Tarde de manta, noche de lámpara

La fuente de verdad es `src/styles/theme.css`: papel rosado y tinta ciruela de día;
ciruela profundo y luz miel de noche. El rediseño «Leer juntos» está integrado.

## Tipografía

- `font-serif`: **Young Serif**, títulos y cifras. H1 / `.display`: 33px, 400, línea 1.04; h2: 21px, 400, línea 1.15.
- `font-sans`: **Nunito Variable**, interfaz, controles y texto funcional (base 16px).
- `font-book`: **Literata Variable**, lectura e itálicas personales (`.display-italic`).
- `font-hand`: **Caveat**, palabras que una persona escribe a la otra (notas, comentarios); nunca navegación ni cifras.
- Etiquetas `.eyebrow` / `.lbl`: 12px. No reducir texto por debajo de 12px ni poner etiquetas decorativas sobre cada título.
- Young Serif dibuja cifras de estilo antiguo: títulos, `.display`, `.title` y `.font-serif` activan `lnum` para que un 0 no se lea «o».

## Paleta

| Token | Claro | Oscuro |
| --- | --- | --- |
| `--bg` | `#f8eee9` | `#1e1520` |
| `--surface` | `#fffaf7` | `#2a1f2b` |
| `--sunk` | `#f1e3dc` | `#170f18` |
| `--ink` | `#33202c` | `#f6e8e4` |
| `--muted` | `#735d69` | `#c3aeb8` |
| `--rule` / `--border` | `#e8d7cf` | `#3d2e3c` |
| `--green` | `#2a7049` | `#8dcba6` |
| `--blue` | `#3c5cb8` | `#a3b5f2` |
| `--rose` | `#b8354f` | `#f08da3` |
| `--amber` | `#e7a33e` | `#f2b865` |
| `--amber-ink` | `#8a5a12` | `#f5c47e` |
| `--plum` (acción principal) | `#5b2b4c` | `#f2b865` |
| `--on-plum` | `#fff6f0` | `#2a1720` |
| `--danger` | `#a8432f` | `#e6a08b` |

Azul/verde identifican personas (`data-accent`), no la acción principal. Rosa marca lo compartido;
miel, la presencia y lo que está pasando ahora. Para texto miel usar `text-amber-ink`.
Respetar `data-theme` y la preferencia del sistema; `.night` mantiene el modo lámpara en lectura.
Usar tokens, no hex locales ni opacidad sobre metadatos. La textura queda detrás del contenido.

## Composición y controles

- Ritmo 4/8/12/16/20/24/32px; agrupar lo relacionado y dejar aire antes de los títulos.
- `.card`: superficie sin borde, radio 22px y sombra de papel. Sin tarjetas anidadas.
- Portadas: radio 3px y sombra de libro; mantener título accesible incluso en miniaturas.
- Filtros siempre con `.chip` (o `FilterChips`); las filas que se deslizan van a sangre con `.fade-x`. Un filtro sin
  alternativas (un solo año, un solo formato) no se muestra.
- Porcentaje leído: `percentOf()` (redondea hacia abajo) en todas las pantallas; 100 % solo al terminar.
- Borrar algo pequeño (cita, respuesta, última sesión) no pregunta: desaparece y el aviso ofrece «Deshacer»
  (`removeWithUndo`). Lo grande (reiniciar o eliminar una lectura) sigue pidiendo confirmación.
- Botones y chips redondos (999px), objetivos táctiles de al menos 44px. Los selectores nativos también deben mantener ese mínimo (`min-h-11`), incluido el año de las estadísticas.
- `.btn-primary`: ciruela de día, miel de noche; una acción dominante por pantalla.
- `.btn-outline` / `.btn-secondary`: apoyo con filete; `.btn-soft`: papel hundido.
- `.icon-btn`: 44×44px. Conservar etiquetas accesibles, estados disabled y foco visible.
- La barra inferior respeta `--tabbar-h: 66px` y las safe areas; el modo lectura no muestra pestañas.
- Comparar a la pareja sin competición: nombres y progreso en su propio color, nunca rankings.

## Movimiento

`--dur-tap: 140ms`, `--dur-move: 280ms`, `--dur-fill: 760ms`; curvas `--ease` y `--spring`.
La presión responde a escala .97. Animar cambios con significado; los bucles se reservan para
presencia/cronómetro activos. Mantener `prefers-reduced-motion`, foco visible y contraste legible.

## PWA y despliegue

HTML y manifest usan el papel claro `#f8eee9`; el meta theme-color oscuro usa `#1e1520`.
El arranque iOS usa icono centrado sobre papel claro incluso de noche (selección oscura poco fiable).
`npm run icons` regenera los PNG desde `public/icon.svg` y `pwa-assets.config.ts`.
Se publica en **Cloudflare Workers** con `npm run build` y `npx wrangler deploy`;
`wrangler.jsonc` sirve `dist` como SPA. El Worker **`greebook`** tiene ese nombre intencionalmente.

## Evitar

No volver a Fraunces/Inter ni a la paleta verde-crema antigua. No añadir cajas anidadas,
rejillas de dashboard, múltiples acciones sólidas, texto minúsculo, bucles decorativos ni
estilos locales que sustituyan los tokens. Referencias ampliadas en `docs/rediseno/README.md`.
