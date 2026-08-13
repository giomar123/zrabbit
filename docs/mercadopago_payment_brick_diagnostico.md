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

## Flujo oficial de prueba de Checkout Bricks

La documentación oficial indica que **Checkout Bricks no soporta cuentas de prueba** para sus pruebas de integración. Para pagos con tarjeta se deben usar las **credenciales de prueba de la cuenta real del vendedor**, un correo de pagador diferente al correo usado en Mercado Pago y una tarjeta de prueba local.

Para simular un pago aprobado en Perú, la guía indica Mastercard `5031 7557 3453 0604`, código `123`, vencimiento `11/30` y titular `APRO`. El formulario de zRabbit emplea tipo de documento DNI; debe usarse un DNI ficticio de **8 dígitos**, conforme al formato peruano. Estos datos se aplican únicamente en el entorno de prueba.

- https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/accounts
- https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/integration-test/test-payment-flow
- https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/integration-test/test-cards

## Fuentes

- https://www.mercadopago.com.pe/developers/en/docs/checkout-bricks/overview
- https://www.mercadopago.com.ar/developers/en/docs/application-details
- https://www.mercadopago.com.pe/ayuda/una-de-las-partes-es-de-prueba-unauthorized-live-credentials_48610
