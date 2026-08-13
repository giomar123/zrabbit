# Integración Mercado Pago

zRabbit usa **Checkout Bricks / Payment Brick** para mantener los medios de pago dentro del checkout de la tienda. El formulario tokeniza los datos sensibles en el navegador con la Public Key; el servidor verifica el total del pedido almacenado y crea el pago con el Access Token privado. La solicitud de creación emplea una clave de idempotencia, y el webhook verifica `x-signature` con la firma secreta antes de volver a consultar el pago en Mercado Pago.

La documentación oficial indica que Payment Brick permite tarjetas, PagoEfectivo y Mercado Pago Wallet en Perú. También requiere que el servidor envíe al API de pagos los campos token, importe, cuotas, medio de pago y correo del pagador, junto con `X-Idempotency-Key` para evitar cargos duplicados.

Fuentes: [Payment Brick — Mercado Pago Perú](https://www.mercadopago.com.pe/developers/en/docs/checkout-bricks/payment-brick/introduction); [Payment submission — Mercado Pago Developers](https://www.mercadopago.com.mx/developers/en/docs/checkout-bricks/card-payment-brick/payment-submission).
