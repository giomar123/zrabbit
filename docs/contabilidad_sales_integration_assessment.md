# Integración de ventas desde zRabbit hacia Contabilidad

## Observación pasiva del módulo de Ventas

El módulo **Ventas** de contabilidad.zrabbit.shop permite registrar una venta manual con los campos: fecha, producto por código, moneda, cantidad, precio unitario, nombre, correo y teléfono del comprador, además de costo de envío opcional. Al guardar, la venta forma parte del inventario y del flujo de caja de contabilidad.

La aplicación carga los procedimientos tRPC `sales.list`, `sales.create`, `sales.update` y `sales.delete`. Se confirmó la existencia de `sales.create` inspeccionando el código público cargado, sin ejecutar ninguna operación de escritura.

El procedimiento `sales.create` recibe `saleDate`, `productId`, `quantity`, `unitPrice`, `currency`, `exchangeRate`, `shippingCost`, `buyerName`, `buyerEmail` y `buyerPhone`. Actualmente no admite una referencia externa única del pedido de zRabbit; esa referencia debe añadirse en contabilidad para que el destino rechace una segunda inserción del mismo pedido aun ante reintentos de red.

El 14 de agosto de 2026 la lista publicada de Ventas ya mostró una columna **Referencia**, confirmando que la ampliación de esquema se desplegó. Falta validar pasivamente que el procedimiento `sales.create` reciba y aplique esa referencia como restricción única con una cuenta técnica de ventas.

La versión publicada ya envía `externalReference` a `sales.create` y contempla una respuesta `{ idempotent: true }` cuando la referencia ya está registrada. Con ello, el contrato puede evitar un segundo descuento de inventario ante reintentos de zRabbit; falta probarlo con una venta controlada usando la cuenta técnica de Ventas.

## Implicación para zRabbit

El registro correcto desde la tienda debe crear una venta en contabilidad únicamente después de un pago aprobado. El producto se identifica por el `sku` importado, que conserva el código de contabilidad. Se deben enviar la referencia única `orderNumber` de zRabbit, producto, cantidad, precio cobrado y datos mínimos del comprador.

## Requisito pendiente

La cuenta técnica vigente es de solo lectura y el contrato documentado solo confirma procedimientos de lectura. Antes de implementar escritura se debe habilitar un procedimiento autenticado de creación de venta con una credencial técnica de alcance limitado y una clave de idempotencia basada en el número de pedido de zRabbit. No se debe automatizar mediante el formulario web ni cookies del navegador.
