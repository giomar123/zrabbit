# Diagnóstico de credenciales y producto de Mercado Pago

La tienda zRabbit integra **Payment Brick** mediante el SDK JavaScript y crea pagos por `POST /v1/payments`. En consecuencia, el producto configurado en la aplicación de Mercado Pago debe reflejar **Checkout Bricks** o **Checkout API**, no Checkout Pro.

La documentación de Mercado Pago permite editar, desde los detalles de la aplicación, la solución y el producto de pago integrados. No se deben borrar aplicaciones ni compartir claves para realizar este ajuste.

Las capturas del propietario confirman que la Public Key y el Access Token proceden de la sección **Pruebas → Credenciales de prueba** de la misma aplicación zRabbit. El diagnóstico pendiente es alinear la solución seleccionada en la aplicación y repetir una compra de prueba usando un correo del comprador diferente del correo del vendedor.

## Evidencia manual no sensible

Verificación comunicada por el propietario el 13 de agosto de 2026:

- Aplicación: **zRabbit** (identificador de aplicación visible: `5719254850259715`).
- Ruta de credenciales: **Pruebas → Credenciales de prueba**.
- Prefijo visible de Public Key: `APP_USR-d6b8`; coincide con el prefijo inspeccionado en la variable pública de Railway.
- Prefijo visible de Access Token: `APP_USR-6995`; coincide con el prefijo inspeccionado en la variable privada de Railway.
- Producto de la aplicación actualizado por el propietario a **Checkout Bricks**.

No se registraron valores completos de credenciales, tokens de tarjeta ni firmas de webhook.

## Fuentes

- https://www.mercadopago.com.pe/developers/en/docs/checkout-bricks/overview
- https://www.mercadopago.com.ar/developers/en/docs/application-details
- https://www.mercadopago.com.pe/ayuda/una-de-las-partes-es-de-prueba-unauthorized-live-credentials_48610
