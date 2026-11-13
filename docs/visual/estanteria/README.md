# Propuesta de estantería móvil

Mockup independiente para revisar la evolución de la estantería. No está importado por la aplicación.

La propuesta ya está integrada en la estantería real (`/estanteria`). La implementación está en `src/screens/Room.tsx`, `src/ui/Library.tsx` y `src/styles/library.css`; utiliza los libros y preferencias existentes. `aplicada-dia.png` y `aplicada-noche.png` son capturas de esa implementación con datos de ensayo.

Además del diseño, la integración conserva las cartas anuales, las dos valoraciones, los pliegues y la vista recordados, los libros dejados a medias y las marcas de siguiente lectura. Los pendientes admiten varios libros, lectores compartidos, nombres largos y lectura a solas.

Verificado en la app real: compilación de producción y 75 pruebas existentes; búsqueda, filtros, vistas, apertura y cierre de la vista previa, navegación al libro, pliegues durante búsquedas y bibliotecas vacías, con solo pendientes o con solo libros dejados. Revisado en móvil, de día y de noche.

- La colección leída ocupa el primer estante. El fondo verde, el doble contorno y la madera retoman el ambiente de las velas.
- Los filtros de lector ocupan una línea; la búsqueda y el orden comparten otra. El cambio entre lomos y portadas vive junto a la colección.
- El pendiente tiene la portada visible, el nombre de su lector y un pequeño detalle de papel y hojas, como en la mesita.
- Se mantienen los componentes `Shelf`, `Spine`, `Cover`, los iconos, las fuentes y los colores de la aplicación. El modo nocturno sigue la preferencia del sistema.
- Los datos son una instantánea del ensayo existente. La propuesta no accede a Supabase, la sesión ni la biblioteca del usuario.

## Ver

Con `npm run dev`:

- Comparación: `/docs/visual/estanteria/index.html`
- Mockup navegable: `/docs/visual/estanteria/mockup.html`
- Capturas: `dia.png`, `noche.png`, `comparacion.png`.

Las cinco entradas de navegación y el botón de añadir enlazan a la app local. En el mockup se pueden probar búsqueda, filtros, orden, vistas, años desplegables y la vista previa de cada libro.

## Comprobaciones

TypeScript: `npx tsc --project docs/visual/estanteria/tsconfig.json`.

Se ha comprobado la búsqueda, su estado vacío y recuperación; el filtro compartido; las portadas; la agrupación de años al ordenar; los desplegables y los diálogos de libros con foco. A 390 × 844 px los ocho lomos de 2026 y el pendiente caben por encima de la navegación. Las capturas se realizan en un iframe con viewport móvil real mediante `frame.html`, sin registrar un service worker.
