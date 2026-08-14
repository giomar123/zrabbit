# Yape y Plin: opciones de cobro para zRabbit

## Conclusión operativa

**No existe una vía pública para que zRabbit “cree su propio Yape o Plin” y cobre automáticamente sin un acuerdo o proveedor.** Para pagos web con confirmación automática, Yape dirige a los comercios a pasarelas autorizadas —Culqi, Niubiz e Izipay— y Mercado Pago documenta su propia integración Yape mediante Checkout API. [1] [2]

| Ruta | Experiencia del cliente | Confirmación automática en zRabbit | Comisión / coste | Uso recomendado |
|---|---|---:|---|---|
| Mercado Pago + Yape | Celular + OTP en checkout | Sí, por API y webhook | Según acuerdo vigente con Mercado Pago | La ruta actual para checkout integrado |
| Pasarela autorizada de Yape | Código de aprobación u OTP, según proveedor | Sí, según el contrato y API de la pasarela | Cotización comercial del proveedor | Alternativa si se negocia mejor tarifa o se requieren otros medios |
| Yape Empresa / QR | Cliente escanea QR o paga a número | No de forma pública en el sitio; se concilia con app o proceso adicional | Las fuentes públicas difieren por producto y fecha; debe cotizarse | Cobro presencial o alternativa manual, no checkout principal |
| Plin QR | Cliente escanea QR, ingresa monto y confirma desde su banco | No se documenta una API pública de checkout | Plin presenta el cobro QR como gratuito para usuarios y comercios, sujeto a condiciones de la entidad | Cobro manual/semimanual, no sustituto directo de una pasarela web |

## Hallazgos relevantes

La guía de Yape para comercios que desean incluir el código de aprobación en una web remite explícitamente a Culqi, Niubiz e Izipay. Esto significa que la integración online oficial se comercializa a través de proveedores, no como una API pública autónoma para cualquier comercio. [1]

La documentación de Mercado Pago sí explica cómo tokenizar Yape con número y OTP y crear el pago como `payment_method_id: "yape"`; el flujo ya incorporado en zRabbit sigue ese modelo. [2]

Yape comunica en su página de micronegocios que los cobros con QR o número pueden realizarse sin comisión, mientras que el anuncio de lanzamiento de Yape Empresa de febrero de 2024 menciona una tasa diaria de 2.95% para ventas por QR o número. La diferencia puede responder al producto, fecha, tipo de cuenta o condiciones comerciales, por lo que **no debe asumirse una tarifa cero** sin una cotización actual de Yape. [3] [4]

Plin documenta QR y pagos desde aplicaciones de entidades financieras, pero su información pública describe una operación donde el cliente escanea, ingresa el monto y autoriza desde su app. No presenta una API de e-commerce pública ni un webhook para conciliar automáticamente pedidos en zRabbit. [5]

## Recomendación técnica

Mantener Mercado Pago para tarjetas y Yape integrado protege el checkout actual con confirmación de estado y webhook. Si la prioridad comercial es reducir comisiones, el siguiente paso es solicitar cotización a Mercado Pago, Culqi, Niubiz e Izipay con el volumen mensual previsto; se debe comparar la comisión efectiva, costos fijos, plazos de abono, contracargos, soporte y si incluyen Yape/Plin.

Un QR de Yape o Plin puede añadirse posteriormente como método **manual** con estado `pendiente de verificación`, referencia de pago y validación administrativa. No debería marcar un pedido como pagado automáticamente ni sustituir el checkout actual hasta disponer de una API, webhooks y un acuerdo oficial.

## Referencias

[1]: https://www.yape.com.pe/preguntas-frecuentes/compras-por-internet/como-puedo-tener-la-opcion-de-compras-por-internet-codigo-de-aprobacion-yape-en-l "Yape: pasarelas para pagos por internet"
[2]: https://www.mercadopago.com.pe/developers/en/docs/checkout-api-payments/integration-configuration/yape "Mercado Pago Developers: Yape con Checkout API"
[3]: https://www.yape.com.pe/productos/micronegocios "Yape Micronegocios"
[4]: https://grupocredicorp.com/en/yape-launches-yape-empresa-exclusively-for-businesses/ "Credicorp: lanzamiento de Yape Empresa"
[5]: https://plin.pe/ "Plin: cobro y pago con QR"
