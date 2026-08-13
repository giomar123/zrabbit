# Lista de verificación para activar Mercado Pago en producción

## Requisitos confirmados en la documentación oficial

Para Checkout Bricks, Mercado Pago indica que se deben activar las credenciales de producción desde **Panel del Desarrollador → Producción → Credenciales de producción** y reemplazar el par usado durante pruebas. El checkout debe estar disponible mediante HTTPS con certificado SSL.

zRabbit ya se publica en `https://zrabbit.shop`, por lo que el requisito de URL HTTPS está cubierto. Antes de habilitar cobros reales se debe verificar que la cuenta vendedora tenga las credenciales de producción activas y que la aplicación continúe configurada como Checkout Bricks.

## Cambios previstos en Railway

| Variable | Acción productiva | Riesgo si se omite |
|---|---|---|
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Sustituir por la Public Key de **Producción** de la misma aplicación | El Brick no podrá tokenizar correctamente pagos reales. |
| `MERCADOPAGO_ACCESS_TOKEN` | Sustituir por el Access Token de **Producción** de la misma aplicación | El servidor no podrá crear ni consultar pagos reales. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Confirmar que corresponde a la configuración de Webhooks de **Producción** | Los eventos reales podrían ser rechazados por firma inválida. |

Las dos primeras variables deben actualizarse como un par antes de ejecutar un redeploy. Por tener prefijo `VITE_`, la Public Key debe formar parte de un nuevo build; guardar la variable sin nuevo despliegue no actualiza el navegador servido.

## Webhook de producción

En la aplicación Mercado Pago se debe registrar, en **Webhooks → Configurar notificaciones → URL modo producción**:

```text
https://zrabbit.shop/api/mercado-pago/webhook
```

Se debe seleccionar el evento **Pagos** (`payment`), guardar y colocar la firma secreta generada en `MERCADOPAGO_WEBHOOK_SECRET` de Railway. La aplicación valida `x-signature` mediante HMAC y registra el resultado por pedido.

## Validación posterior al corte

1. Crear un pedido real de importe mínimo usando una tarjeta real autorizada por el propietario.
2. Confirmar que el checkout responde con un estado de pago, no con 401.
3. Comprobar en Railway el registro de pago y en Administración → Pedidos el evento webhook asociado.
4. Confirmar en el panel Mercado Pago que la notificación de `payment` se entregó correctamente.

## Fuentes oficiales

- https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/integration-test/go-to-production-requirements
- https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks
