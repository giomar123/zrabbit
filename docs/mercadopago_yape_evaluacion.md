# Evaluación de Yape para zRabbit

## Resultado

El Payment Brick actual de zRabbit está configurado para `creditCard`, `debitCard` y `mercadoPago`. La documentación de Mercado Pago enumera como métodos configurables en ese Brick: tarjetas de crédito, débito, prepago, cuenta Mercado Pago (`wallet_purchase`) y PagoEfectivo (`pagoefectivo_atm`). **Yape no figura como un método configurable de Payment Brick**.

Por ello, Yape no aparece por una omisión de la cuenta ni por un parámetro que pueda activarse con `paymentMethods` sin modificar el flujo de la tienda.

## Integración necesaria

Mercado Pago documenta Yape para **Checkout API**, no para Payment Brick. El flujo requiere:

1. Una sección propia para introducir teléfono peruano y OTP de Yape.
2. Generar un token de un solo uso con `mp.yape({ phoneNumber, otp }).create()` usando la Public Key productiva.
3. Enviar al servidor el token generado y crear el pago con `payment_method_id: "yape"`, `installments: 1`, monto y correo del comprador.
4. Presentar el resultado aprobado o rechazado y mantener la conciliación por webhook actual.

El flujo de tarjeta existente no debe modificarse. Yape debe añadirse como alternativa explícita, conservando la creación idempotente de pagos y el webhook ya validados.

## Prueba oficial

La documentación incluye simulación de Yape con teléfono `111111111` y OTP `123456` para un resultado aprobado cuando se usan credenciales de prueba de la cuenta productiva. En producción, el usuario ingresa su teléfono y OTP reales desde su aplicación Yape.

## Referencias

- https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/payment-brick/advanced-features/manage-payment-methods
- https://www.mercadopago.com.pe/developers/en/docs/checkout-api-payments/integration-configuration/yape.md
