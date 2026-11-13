# Greenbook · una habitación con más carácter

Los cambios están aplicados a las pantallas reales de la app móvil.

- Las velas conservan su pulsación prolongada. Un arco, ramas dibujadas y luz cálida enmarcan la escena; la luz responde al estado real de las velas.
- Las portadas sin foto tienen textura y detalles de encuadernación. Las portadas reales se mantienen.
- La mesilla da más presencia al libro, conserva los dos marcapáginas y añade un acceso a sus páginas y una ilustración propia.
- La estantería conserva lomos, portadas, cintas y filtros, con fondos que dan profundidad a los estantes.
- Las notas parecen pequeños papeles y la navegación queda en una barra flotante.
- Se respetan el modo nocturno y la preferencia de reducir movimiento.

[Ver propuesta](propuesta.html) · [Comparar con el primer ajuste](index.html)

## Probar la app

```sh
npm run dev:ensayo
```

Abre http://127.0.0.1:5176 y elige «Entrar como Laura» con la historia de ejemplo marcada. Se utiliza el modo ensayo existente: los datos se guardan únicamente en el navegador. El comando habitual `npm run dev` sigue usando la configuración normal.

Verificado: compilación de producción, 75 pruebas existentes, navegación a 320/390/430 px, búsquedas, filtros, vistas, desplegables, entrada al libro y encendido/apagado de la vela. También se han comprobado la iluminación y las animaciones con movimiento reducido.

Las imágenes `conservador-*.png` conservan la propuesta anterior; `despues-*.png` muestran la actual. Las ilustraciones están en `src/ui/RoomArt.tsx` y el acabado visual en `src/styles/room.css`.
