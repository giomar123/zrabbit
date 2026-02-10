# Zrabbit Business - Lista de Tareas

## Base de Datos y Backend
- [x] Diseñar esquema de base de datos para productos, categorías, compras, ventas, inversiones
- [x] Implementar tabla de productos con códigos autogenerados por categoría
- [x] Implementar tabla de compras con todos los campos requeridos
- [x] Implementar tabla de ventas con información de compradores
- [x] Implementar tabla de inversiones con inversores Giomar y Erick
- [x] Crear procedimientos tRPC para CRUD de productos
- [x] Crear procedimientos tRPC para CRUD de compras
- [x] Crear procedimientos tRPC para CRUD de ventas
- [x] Crear procedimientos tRPC para CRUD de inversiones
- [x] Implementar cálculo automático de inventario (stock final)
- [x] Implementar cálculo automático de precio sugerido (25% margen)
- [x] Implementar cálculo automático de flujo de caja mensual
- [x] Implementar generación automática de códigos de producto por categoría

## Frontend - Diseño y Navegación
- [x] Diseñar paleta de colores elegante y profesional
- [x] Implementar layout principal con sistema de pestañas
- [x] Crear componente de navegación entre módulos
- [x] Implementar diseño responsive para todos los módulos

## Frontend - Módulos
- [x] Módulo de Dashboard con métricas clave y gráficos
- [x] Módulo de Compras con formulario y listado
- [ ] Módulo de Ventas con formulario y listado
- [ ] Módulo de Inventario con cálculos automáticos
- [x] Módulo de Productos con CRUD completo
- [ ] Módulo de Inversiones con formulario y listado
- [ ] Módulo de Flujo de Caja con resumen mensual

## Funcionalidades Avanzadas
- [ ] Sistema de filtrado por fecha en todos los módulos
- [ ] Sistema de búsqueda por producto, categoría, estado
- [ ] Filtrado por inversor en módulo de inversiones
- [ ] Exportación de datos a Excel
- [ ] Validaciones de formularios
- [ ] Mensajes de confirmación y errores

## Cálculos Automáticos
- [ ] Cálculo de total en compras (cantidad × precio unitario)
- [ ] Cálculo de precio sugerido (precio unitario × 1.25)
- [ ] Cálculo de total en ventas (cantidad × precio unitario)
- [ ] Cálculo de stock final (total compras - total ventas)
- [ ] Cálculo de valor de inventario (stock × precio unitario)
- [ ] Cálculo de valor total del stock
- [ ] Cálculo de balance neto mensual (inversiones + ventas - compras)
- [ ] Cálculo de caja disponible acumulada

## Testing y Validación
- [ ] Pruebas unitarias para procedimientos de productos
- [ ] Pruebas unitarias para procedimientos de compras
- [ ] Pruebas unitarias para procedimientos de ventas
- [ ] Pruebas unitarias para cálculos automáticos
- [ ] Verificación de generación de códigos de producto
- [ ] Verificación de cálculos de inventario
- [ ] Verificación de flujo de caja

## Migración de Datos
- [ ] Script para importar datos del Excel existente
- [ ] Importar productos desde la pestaña Listas
- [ ] Importar compras desde la pestaña Compras
- [ ] Importar ventas desde la pestaña Ventas
- [ ] Importar inversiones desde la pestaña Inversiones

## Bugs Reportados
- [x] Corregir consulta SQL de flujo de caja para usar SUBSTRING en lugar de DATE_FORMAT con campos VARCHAR

## Importación de Datos del Excel
- [x] Extraer datos de la pestaña "Listas" (productos)
- [x] Extraer datos de la pestaña "Compras"
- [x] Extraer datos de la pestaña "Ventas"
- [x] Extraer datos de la pestaña "Inversiones"
- [x] Crear script de importación para cargar todos los datos
- [x] Ejecutar script y verificar que todos los datos se hayan importado correctamente

## Nuevas Solicitudes del Usuario
- [x] Permitir crear nuevo producto desde el formulario de compras con código autogenerado
- [x] Cambiar margen de precio sugerido de 25% a 30% en todos los cálculos
- [x] Implementar módulo de Ventas completo (actualmente en desarrollo)
- [x] Implementar módulo de Inventario completo (actualmente en desarrollo)
- [x] Implementar módulo de Inversiones completo (actualmente en desarrollo)
- [x] Implementar módulo de Flujo de Caja completo (actualmente en desarrollo)

## Bugs Pendientes
- [x] Corregir error en módulo de Inventario: Cannot read properties of undefined (reading 'toFixed')

- [x] Corregir bucle infinito en el inicio de sesión (ya funciona correctamente)
- [ ] Corregir cálculo del Valor del Inventario en Dashboard (muestra S/. 0.00) - EN PROGRESO: consulta SQL funciona pero Drizzle no devuelve datos correctamente
- [x] Mostrar nombres reales de productos en "Productos Más Vendidos" en lugar de códigos numéricos - COMPLETADO
- [ ] Implementar gráfico de Flujo de Caja Mensual en Dashboard con datos reales - EN PROGRESO: error SQL en getCashFlow

## Nuevas Correcciones Solicitadas
- [x] Agregar botón para volver al Dashboard en cada pestaña (logo Zrabbit ahora es clickeable)
- [ ] Corregir cálculo de inversiones (muestra valor incorrecto, no son 11 mil soles)
- [ ] Corregir gráfico de Flujo de Caja Mensual para que muestre datos
- [ ] Corregir indicadores del Dashboard (Valor del Inventario sigue en S/. 0.00)

## Bugs Críticos Reportados
- [x] Inventario muestra todo en 0 (compras, ventas, stock final, valores) - RESUELTO: Drizzle devuelve datos en formato anidado [[datos], metadata]
- [x] Gráficos muestran error al cargar la página - RESUELTO: getCashFlow ahora devuelve datos correctamente

## Problemas Pendientes
- [ ] Gráfico de Flujo de Caja no muestra líneas (datos llegan pero no se renderizan visualmente)
- [ ] Actividad Reciente muestra "Producto #30039" en lugar de nombres reales de productos

## Bug Reportado - Cálculo Incorrecto
- [x] Corregir cálculo de ventas del mes en Dashboard (muestra S/. 2,249.21 pero debería ser S/. 1,878.21) - RESUELTO: Re-importación desde Excel
- [x] Corregir cálculo de compras del mes en Dashboard (muestra S/. 721.60 pero debería ser S/. 1,602.50) - RESUELTO
- [x] Verificar si hay datos duplicados en la base de datos durante la importación - RESUELTO: Limpieza y re-importación

## Nueva Solicitud - Gráficos del Dashboard
- [x] Implementar gráfico de barras agrupadas mostrando Total Inversión, Compras, Ventas y Balance Neto por mes
- [x] Implementar gráfico de línea mostrando evolución de Caja Disponible acumulada por mes
- [x] Reemplazar el gráfico actual del Dashboard con estos dos nuevos gráficos

## Corrección Solicitada - Gráfico de Línea
- [x] Corregir gráfico de línea en Dashboard para mostrar Ventas por mes (actualmente muestra Caja Acumulada)

## Nueva Solicitud - Encabezado Persistente
- [x] Asegurar que todas las páginas (Ventas, Compras, etc.) usen el componente Layout para mantener navegación visible

## Nueva Funcionalidad - Módulo de Gastos
- [x] Crear tabla de gastos en la base de datos con categorías (Publicidad, Transporte, Embalaje, Otros)
- [x] Implementar procedimientos tRPC para CRUD de gastos
- [x] Crear página de Gastos con tarjetas de resumen por categoría
- [x] Implementar formulario para registrar, editar y eliminar gastos
- [x] Agregar pestaña de Gastos en la navegación principal
- [x] Integrar gastos del mes en el Dashboard
- [x] Actualizar Flujo de Caja para incluir gastos en el balance

## Nueva Solicitud - Caja Disponible en Dashboard
- [x] Agregar tarjeta de "Caja Disponible" mostrando efectivo acumulado total (Inversiones + Ventas - Compras - Gastos)

## Nueva Funcionalidad - PWA (Progressive Web App)
- [x] Crear manifest.json con configuración de la PWA
- [x] Generar íconos de la app en diferentes tamaños (192x192, 512x512)
- [x] Implementar service worker para funcionalidad offline
- [x] Registrar service worker en la aplicación
- [x] Actualizar HTML con meta tags y enlaces al manifest

## Actualización - Logo Personalizado PWA
- [x] Reemplazar íconos PWA con logo de conejo Zrabbit en 192x192 y 512x512

## Corrección - Error WebSocket Vite HMR
- [x] Actualizar configuración de Vite para corregir WebSocket HMR en entorno de desarrollo

## Corrección Adicional - WebSocket HMR Host
- [x] Agregar configuración de host dinámico en HMR para usar el dominio del proxy correctamente

## Corrección Urgente - Registro de Ventas
- [x] Investigar y corregir error en el registro de ventas (productos no se agregan)
- [x] Desactivar funcionalidad offline del service worker (solo modo online)

## Nueva Mejora - Selector de Productos en Ventas
- [x] Filtrar selector para mostrar solo productos con stock disponible (cantidad > 0)
- [x] Agregar funcionalidad de búsqueda/filtrado por texto en el selector
- [x] Mostrar código del producto y stock disponible en cada opción

## Nueva Mejora - Gráfico de Flujo de Caja Últimos 3 Meses
- [x] Agregar gráfico de barras mostrando flujo de caja de los últimos 3 meses en Dashboard
- [x] Usar el mismo formato que el gráfico mensual (Inversiones, Compras, Ventas, Gastos, Balance)

## Ajuste - Reordenar Gráficos en Dashboard
- [x] Mover gráfico de Últimos 3 Meses antes del gráfico mensual completo

## Nueva Mejora - Buscador de Productos en Compras
- [x] Agregar campo de búsqueda en el selector de productos de Compras
- [x] Permitir filtrar productos por nombre o código en tiempo real
