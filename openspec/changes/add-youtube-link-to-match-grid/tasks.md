## 1. Datos y persistencia

- [x] 1.1 Añadir el campo opcional `youtube_link` a la tabla `partidos` de Supabase.
- [x] 1.2 Extender el tipo `Partido` con `youtube_link?: string | null` y mantener la compatibilidad con el resto de campos del partido.
- [x] 1.3 Actualizar la consulta de partidos en `services/dataService.ts` para devolver el enlace junto al resto del partido.

## 2. Renderizado del grid

- [x] 2.1 Añadir el logo de YouTube como recurso visual del proyecto.
- [x] 2.2 En la vista del grid de partidos, renderizar el botón del vídeo solo cuando `youtube_link` tiene valor no vacío.
- [x] 2.3 Usar el enlace como acción externa en una nueva pestaña y mantener el aspecto compacto del grid.

## 3. Validación

- [x] 3.1 Verificar que un partido con enlace visible muestra el icono y abre el vídeo correctamente.
- [x] 3.2 Verificar que un partido sin enlace no muestra ningún icono ni espacio residual.
- [x] 3.3 Confirmar que el cambio no rompe el comportamiento ni la estructura del grid de partidos del equipo.
