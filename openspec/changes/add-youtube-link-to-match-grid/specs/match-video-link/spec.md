## ADDED Requirements

### Requirement: Persistir el enlace del partido en YouTube
El sistema SHALL guardar un enlace opcional de YouTube asociado a cada partido en la base de datos, manteniendo el valor junto al registro del partido y sin bloquear la creación ni la visualización del resto de datos del partido.

#### Scenario: Guardar URL válida
- **WHEN** un partido tiene un enlace de YouTube válido
- **THEN** el sistema almacena la URL en el campo del partido y la conserva al recuperar los datos del equipo

#### Scenario: Partido sin enlace
- **WHEN** un partido no tiene ningún valor en el campo del enlace
- **THEN** el sistema mantiene el campo vacío y no debe interpretar que exista un vídeo asociado

### Requirement: Mostrar el botón solo cuando exista enlace
El sistema MUST renderizar el botón del vídeo únicamente cuando `youtube_link` está rellenado; si el campo está vacío, no debe mostrarse ni el icono ni el contenedor del enlace.

#### Scenario: Enlace rellenado
- **WHEN** la URL del partido presenta valor no vacío
- **THEN** el sistema muestra el botón con el logo de YouTube para abrir el vídeo

#### Scenario: Enlace vacío
- **WHEN** la URL del partido es `null`, `undefined` o una cadena vacía
- **THEN** el sistema oculta completamente el control del vídeo

### Requirement: Abrir el video con branding de YouTube
El sistema SHALL usar un icono visual basado en el logo de YouTube para distinguir la acción de reproducción del resto de enlaces y abrir el vídeo en una nueva pestaña cuando el usuario interactúa con él.

#### Scenario: Usuario pulsa el botón
- **WHEN** el usuario hace clic en el botón del vídeo visible
- **THEN** el sistema abre el enlace externo del partido en una nueva pestaña y mantiene la vista actual intacta

#### Scenario: Sin acceso directo disponible
- **WHEN** el partido no tiene URL configurada
- **THEN** no se renderiza ninguna acción de video y no hay fallback visible ni enlace rotos
