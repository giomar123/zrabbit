# Despliegue de Figura Fiebre

El proyecto es una aplicación Node.js con React, Express, tRPC y MySQL/TiDB. El archivo `railway.json` establece el comando de compilación `pnpm build`, el arranque `pnpm start` y una comprobación de salud en `/`. Railway admite definir este tipo de configuración como código y usar comandos de construcción y arranque personalizados. [1] [2]

## Publicación desde GitHub

El código se sincronizará con el repositorio seleccionado `giomar123/zrabbit`. En Railway, se debe crear un proyecto nuevo, elegir **Deploy from GitHub Repo**, seleccionar dicho repositorio y autorizar la rama `main`. Railway desplegará automáticamente los commits posteriores de esa rama.

| Variable | Uso | Estado para el primer despliegue |
|---|---|---|
| `DATABASE_URL` | Base de datos MySQL/TiDB de productos, pedidos y usuarios. | Obligatoria |
| `JWT_SECRET` | Firma de la sesión de administración. | Obligatoria |
| `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID` | Inicio de sesión del panel privado. | Obligatoria si se conserva la autenticación actual |
| `OWNER_OPEN_ID` | Identifica la cuenta propietaria que recibe el rol de administrador. | Obligatoria para operar el panel |
| `CANONICAL_ORIGIN` | URL pública final, por ejemplo `https://tudominio.com`; se usa para `og:url`, canónica e imágenes de compartir. | Recomendable antes de campañas |
| `MERCADOPAGO_ACCESS_TOKEN` | Procesa y confirma pagos desde el servidor. | Pendiente de crear la cuenta Mercado Pago |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Tokeniza la tarjeta en el formulario de pago integrado. | Pendiente de crear la cuenta Mercado Pago |

> **Pagos:** el checkout, los pedidos y los estados de pago ya cuentan con una base preparada. No se deben añadir las claves de Mercado Pago al repositorio ni al código. Cuando exista la cuenta de vendedor, se registrarán como secretos del entorno y se habilitará el formulario de pago dentro de la tienda.

## Validación antes de producción

Antes de conectar un dominio y lanzar campañas, ejecuta `pnpm check` y `pnpm test`. Después del despliegue, configura `CANONICAL_ORIGIN` con el dominio definitivo y prueba una página de producto publicada con el depurador de enlaces de Meta. Cada producto publicado expone título, descripción, URL canónica, imagen Open Graph y datos estructurados desde el servidor.

## Referencias

[1] [Railway Docs — Config as Code](https://docs.railway.com/config-as-code/reference)

[2] [Railway Docs — Build Configuration](https://docs.railway.com/builds/build-configuration)
