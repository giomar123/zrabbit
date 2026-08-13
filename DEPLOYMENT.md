# Despliegue de Figura Fiebre

El proyecto es una aplicación Node.js con React, Express, tRPC y MySQL/TiDB. El archivo `railway.json` establece el comando de compilación `pnpm build`, el arranque `pnpm start` y una comprobación de salud en `/`. Railway admite definir este tipo de configuración como código y usar comandos de construcción y arranque personalizados. [1] [2]

## Publicación desde GitHub

El código se sincronizará con el repositorio seleccionado `giomar123/zrabbit`. En Railway, se debe crear un proyecto nuevo, elegir **Deploy from GitHub Repo**, seleccionar dicho repositorio y autorizar la rama `main`. Railway desplegará automáticamente los commits posteriores de esa rama.

## Base de datos en Railway

> **Importante:** la base de datos de desarrollo de este proyecto ya contiene las tablas `users`, `categories`, `products`, `productImages`, `orders` y `orderItems`. Una implementación en Railway es un entorno independiente: no reutiliza ni copia automáticamente esa base. Por ello, el servicio publicado necesita su propia base MySQL y una migración inicial.

En el mismo proyecto de Railway, crea un servicio **MySQL** desde el botón **+ New**. Railway publica en ese servicio, entre otras, la variable `MYSQL_URL`. En el servicio de la aplicación zRabbit abre **Variables** y registra la referencia siguiente, sustituyendo `MySQL` por el nombre exacto de tu servicio de base de datos:

```dotenv
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

Railway resuelve las referencias entre servicios con la sintaxis `${{SERVICE_NAME.VARIABLE}}`. Después de guardar la variable, revisa y despliega el cambio. Finalmente, desde la consola del servicio web de Railway ejecuta una vez:

```bash
pnpm drizzle-kit migrate
```

Este comando crea las tablas definidas en `drizzle/schema.ts` dentro de tu MySQL de Railway. No uses `drizzle-kit generate` en producción: las migraciones ya están versionadas en el repositorio. Si la consola no encuentra el comando, ejecuta `pnpm exec drizzle-kit migrate`.

Tras completar la migración, puedes cargar el catálogo inicial de prueba con sus imágenes públicas ejecutando una sola vez:

```bash
pnpm seed:railway
```

La carga inicial crea únicamente los elementos que todavía no existan: la categoría Pokémon, el producto **Pikachu Select — Serie 11** a S/ 95 y sus tres imágenes. Es segura de ejecutar más de una vez y no reemplaza productos ni imágenes ya creados desde el panel. El logotipo y la vitrina hero usan URLs CDN públicas para mostrarse tanto en el entorno de Manus como en Railway.

| Comprobación posterior | Resultado esperado |
|---|---|
| Cargar la tienda | El catálogo consulta la base de Railway sin errores. |
| Abrir `/admin` con el rol administrador | Productos, usuarios y pedidos muestran la información del nuevo entorno. |
| Ejecutar el comando de migración otra vez | No se recrean ni eliminan datos; se aplican únicamente migraciones pendientes. |

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

[3] [Railway Docs — MySQL](https://docs.railway.com/databases/mysql)

[4] [Railway Docs — Using Variables](https://docs.railway.com/variables)
