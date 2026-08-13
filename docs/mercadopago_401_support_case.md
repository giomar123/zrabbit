# Caso de soporte — 401 persistente en Payment Brick de pruebas

## Resumen

La integración de **zRabbit** (`https://zrabbit.shop`) usa **Mercado Pago Payment Brick** y crea pagos mediante `POST /v1/payments`. En el entorno de pruebas, la creación de pago responde de forma consistente con HTTP `401`, código `unauthorized` y causa `Unauthorized use of live credentials`.

## Aplicación e integración

| Campo | Valor |
|---|---|
| Aplicación Mercado Pago | zRabbit |
| ID de aplicación | `5719254850259715` |
| País de operación | Perú |
| Producto configurado | Checkout Bricks |
| Sitio | `https://zrabbit.shop` |
| Integración | Payment Brick + `POST /v1/payments` |

## Comprobaciones realizadas

La Public Key y el Access Token se obtuvieron de **Pruebas → Credenciales de prueba** de la misma aplicación. La aplicación fue alineada con Checkout Bricks. Se usó la tarjeta de prueba Mastercard documentada para Perú, con vencimiento, CVV y titular de escenario aprobado. También se usó un correo del pagador diferente del correo de la cuenta vendedora.

La aplicación registra únicamente prefijos y huellas SHA-256 truncadas; no se incluyen secretos ni tokens de tarjeta:

```text
clientPublicKey: prefix APP_USR-d6b8, fingerprint 901b18d85e96
serverPublicKey: prefix APP_USR-d6b8, fingerprint 901b18d85e96
accessToken: prefix APP_USR-6995, fingerprint b3f2efa54d4b
cardToken: present true, fingerprint 49f4be72952c
```

El cliente y el servidor usan la misma Public Key, y el token de tarjeta llega al backend. La respuesta de Mercado Pago sigue siendo:

```text
HTTP 401
error: unauthorized
message: Unauthorized use of live credentials
```

## Transcripción de evidencia saneada

El propietario reportó desde Railway el siguiente bloque, sin valores secretos:

```text
[Mercado Pago credential trace] {
  cardToken: { present: true, fingerprint: '49f4be72952c' },
  clientPublicKey: { prefix: 'APP_USR-d6b8', fingerprint: '901b18d85e96' },
  serverPublicKey: {
    configured: true,
    prefix: 'APP_USR-d6b8',
    fingerprint: '901b18d85e96'
  },
  accessToken: {
    configured: true,
    prefix: 'APP_USR-6995',
    fingerprint: 'b3f2efa54d4b'
  }
}
```

El propietario también confirmó que ambos prefijos proceden de **zRabbit → Pruebas → Credenciales de prueba** de la aplicación `5719254850259715`, y que posteriormente cambió el producto de esa aplicación a **Checkout Bricks**.

## Solicitud a soporte

Por favor, confirmen si las credenciales de prueba de la aplicación `5719254850259715` están habilitadas para pagos con tarjeta mediante Payment Brick en Perú, y si existe alguna restricción, activación pendiente o conflicto de entorno asociado a este par de credenciales. También indiquen por qué una solicitud con las credenciales de prueba listadas para esa aplicación y una tarjeta oficial de prueba se clasifica como uso de credenciales live.

## Referencias oficiales consultadas

- https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/integration-test/test-payment-flow
- https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/integration-test/test-cards
- https://www.mercadopago.com.pe/ayuda/una-de-las-partes-es-de-prueba-unauthorized-live-credentials_48610
