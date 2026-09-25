# Nuevos filtros en Procesos

## Alcance
- Ampliar el resumen de etapas existente para incluir, en la misma consulta por tenant, `status`, `planned_end` y `external_entity` por proceso. No habrá consultas por cada proceso.
- Mantener intactos el Panel de Control, la lógica de orden natural y la preferencia de orden existente.

## Filtros y URL
- Incorporar filtros por estado de avance, vencimiento próximo, organismo y proyecto.
- Leer y escribir búsqueda, tipo y los nuevos filtros en los parámetros de la URL para que el enlace sea compartible.
- Aplicar todos los filtros en conjunto antes del orden por número.
- Calcular “hoy” con la fecha local del navegador y comparar las fechas planificadas de forma inclusiva.
- Mostrar “Sin proyecto” cuando corresponda y ocultar Proyecto si solo hay un proyecto real y no existen procesos sin proyecto.
- Ocultar Tipo de proceso cuando todos los procesos pertenecen al mismo tipo.

## Contadores y filas
- Añadir los chips “Con atraso (N)” y “Vence en 15 días (N)”, sincronizados con sus selectores.
- Cada contador respetará los demás filtros activos, pero omitirá su propio filtro para indicar cuántos resultados produciría al activarlo.
- Añadir por fila el total de etapas atrasadas y la fecha de vencimiento pendiente más próxima dentro de 15 días.
- Mostrar “Limpiar filtros” solamente cuando exista algún filtro o búsqueda activa.

## Presentación y verificación
- Apilar los selectores en pantallas pequeñas y conservar su distribución compacta en escritorio.
- Verificar TypeScript y el estado de compilación; reportar únicamente los archivos modificados.
