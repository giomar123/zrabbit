# Evaluación inicial de integración con contabilidad.zrabbit.shop

## Acceso verificado

El 14 de agosto de 2026 se confirmó el acceso autenticado al sistema **Zrabbit Gestión Empresarial** mediante la sesión de Google autorizada por el propietario. El panel presenta módulos de Compras, Ventas, Inventario, Productos, Inversiones, Gastos, Divisas, Flujo de Caja y Usuarios.

## Hallazgos iniciales

El dashboard muestra que el origen mantiene inventario, códigos de producto y actividad de ventas. Se observaron productos con códigos como `POK0000014` y `DBZ0000018`, lo que permite plantear un mapeo estable entre el sistema de contabilidad y la tienda. La siguiente inspección debe centrarse en Inventario y Productos para identificar campos, acciones de exportación y señales de API o eventos.

## Inventario y catálogo observados

El módulo de Inventario muestra 59 productos en stock, 46 productos disponibles y una tabla con `Código`, `Producto`, `Compras`, `Ventas`, `Stock Final`, `Valor Unitario`, `Valor Total` y `Estado`. El módulo de Productos registra 60 referencias y ofrece un botón **Nuevo Producto**; su tabla expone `Código`, `Nombre` y `Categoría`.

Los códigos son únicos y representan la mejor clave de sincronización. La importación inicial puede preservar `Código` como identificador externo, `Nombre`, `Categoría`, `Stock Final` y `Valor Unitario`. Antes de fijar el precio visible de la tienda se debe acordar si `Valor Unitario` es costo interno o precio de venta, pues el sistema fuente lo presenta como valor de inventario.

## Contrato de lectura identificado

La sesión autenticada del sistema origen consume un endpoint tRPC privado con los procedimientos `products.list`, `inventory.list` y `categories.list`. La respuesta de `products.list` entrega como mínimo `id`, `code`, `name`, `categoryId`, `createdAt` y `updatedAt`; el inventario aporta las cifras de compras, ventas, stock final y valor unitario.

Este contrato es suficiente para una importación de lectura, pero no debe usarse con cookies del navegador como mecanismo de sincronización continua. Para automatizarla se requiere una credencial de servicio dedicada o un webhook emitido por el sistema de contabilidad cuando cambien productos, compras o ventas.

## Precio público confirmado

El módulo **Compras** contiene 80 registros y expone las columnas `Fecha`, `Código`, `Producto`, `Cantidad`, `P. Unitario`, `Total`, `Total S/.`, `P. Sugerido` y `Estado`. El propietario confirmó que **P. Sugerido** será el precio público en zRabbit.

Para cada código se debe seleccionar la compra más reciente con un precio sugerido vigente. Los movimientos en estado `Recibido` representan inventario disponible; los movimientos `Pendiente` no deben aumentar el stock publicado hasta que el sistema de origen los marque como recibidos. El precio sugerido de la última compra puede actualizar el precio de venta de zRabbit, pero las imágenes seguirán siendo gestionadas por el panel de la tienda.

La lectura autenticada de Compras confirma el contrato: `id`, `purchaseDate`, `productId`, `quantity`, `unitPrice`, `total`, `suggestedPrice`, `currency`, `exchangeRate`, `totalPen`, `shippingCost`, `status`, `detail`, `createdAt`, `updatedAt` y el objeto `product`. La regla de mapeo propuesta usará por cada `productId` el movimiento más reciente con `status = Recibido`, y tomará `suggestedPrice` como `priceInCents` en zRabbit.

La comprobación de una compra reciente confirma que `purchaseDate` llega como `YYYY-MM-DD`, el estado recibido se representa como `Recibido` y `suggestedPrice` llega como una cadena decimal, por ejemplo `"65.00"`. El objeto anidado de producto aporta `code`, `name` y `categoryId`.

La lectura de Inventario devuelve `productId`, `productCode`, `productName`, `categoryId`, `totalPurchased`, `totalSold`, `finalStock`, `avgUnitPrice` e `inventoryValue`. El campo de stock que se copiará a zRabbit es `finalStock`; no se usará `avgUnitPrice` ni `inventoryValue` como precio de venta.

## Alcance de sincronización propuesto

La primera importación deberá conservar en zRabbit nombre, código, precio, stock y estado. Las imágenes no serán sincronizadas automáticamente: se incorporarán después desde la administración de la tienda.
