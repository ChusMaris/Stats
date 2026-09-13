## Context

La aplicación ya modela los partidos con sus equipos, fecha, jornada y resultados, y los carga desde Supabase. El problema actual es que la información del video de YouTube no forma parte del estado del partido ni de la interfaz del grid, así que no existe una forma consistente de guardar ni mostrarlo desde la vista del equipo.

La solución debe ser mínima y segura: conservar el valor como dato opcional dentro del mismo registro del partido, reutilizar el flujo de carga existente y ocultar la acción por defecto cuando el enlace no exista.

## Goals / Non-Goals

**Goals:**

- Guardar un enlace de YouTube asociado a cada partido dentro del registro del partido.
- Mostrar el botón del vídeo solo cuando exista valor en el campo.
- Usar una imagen del logo de YouTube como icono visual del botón.
- Mantener la cuadrícula de partidos estable y sin elementos vacíos.

**Non-Goals:**

- No se añadirá un sistema de gestión de vídeos ni un reproductor embebido.
- No se cambiará la lógica de resultados, asistencias ni estadísticas del partido.
- No se creará una migración compleja ni un nuevo backend; se trabajará sobre la columna opcional del partido.

## Decisions

### Añadir una columna opcional al registro del partido

Se guardará un campo `youtube_link` en `partidos` con tipado de texto y valor opcional. Esto permite conservar el dato junto al partido sin duplicar información ni introducir una nueva entidad de negocio.

Se descarta guardar la URL en localStorage o en una tabla auxiliar porque eso rompería la relación directa entre partido y vídeo y complicaría la sincronización con Supabase.

### Propagar el campo a través del modelo y la carga

El modelo `Partido` se ampliará con `youtube_link?: string | null`, y `fetchCompeticionDetails` incluirá ese valor al obtener los partidos reales con sus joins. Así el componente del grid recibe el mismo dato que el resto de la información del partido sin cambios de estructura más allá del campo nuevo.

Se descarta introducir una transformación manual en cada vista porque centraliza la carga y reduce la posibilidad de inconsistencias.

### Renderizar el botón solo si hay valor

La vista del partido debe evaluar `match.youtube_link` o el valor equivalente y mostrar un enlace con el logo solo cuando `typeof link === 'string' && link.trim() !== ''`. El resto del tiempo no existe ni el icono ni el contenedor del enlace.

Se descarta mostrar un icono deshabilitado o un placeholder para evitar espacios vacíos y confusión visual.

### Usar una imagen del logo de YouTube como control visual

Se añadirá un recurso estático en `src/assets/images` con el logo de YouTube para que la acción tenga branding claro y no dependa de un icono genérico o de una librería extra. El enlace se abrirá con `target="_blank"` y `rel="noopener noreferrer"`.

Se descarta un icono generado por texto o una librería SVG adicional porque el requisito explícito pide una imagen del logo de YouTube y mantener la UI simple.

## Risks / Trade-offs

- [Enlaces con formato no estándar o cadenas vacías] → Se validará con una comprobación simple de valor no vacío y se normalizará únicamente para evitar errores visuales; no se exige comprobación compleja de dominio.
- [URL de YouTube con watch, shorts o embed] → Se aceptará cualquier URL válida que se guarde en `youtube_link`; la UI solo la abrirá, sin intentar interpretar la variante.
- [Cambios de layout por añadir un botón nuevo] → Se limitará el ancho y la disposición del botón para que el diseño del grid siga siendo compacto.

## Migration Plan

1. Añadir la columna opcional `youtube_link` a la tabla `partidos` en Supabase.
2. Extender el tipo `Partido` y la consulta de `fetchCompeticionDetails` para cargar el campo.
3. Ajustar la UI del grid para renderizar el botón solo cuando haya valor.
4. Validar en varios partidos si hay valor presente y si no lo hay el botón desaparece sin dejar hueco o errores.
5. Si se identifica un caso de datos inválidos, se corrige en la fuente de datos y no se introduce lógica adicional para gestionar formatos raros.

## Open Questions

- Ninguna. El requisito es claro y la solución puede implementarse con una columna opcional y una comprobación de renderizado condicional.
