# Cron de sincronización en Railway

El servicio web y el servicio cron deben compartir el mismo repositorio, pero ejecutar comandos distintos. Railway documenta que el comando de inicio se ejecuta en un proceso shell; por ello puede usar una expansión de variable de entorno para seleccionar el proceso de cada servicio.

La configuración propuesta conserva el valor predeterminado `start` para la tienda y utiliza `sync:contabilidad` solo en el servicio cron mediante `ZRABBIT_PROCESS`.

La expresión `0 14 1,16 * *` se evalúa en UTC y ejecuta el proceso los días 1 y 16 a las 14:00 UTC, equivalentes a las 09:00 en Perú.

## Referencias

[1] [Railway — Set a Start Command](https://docs.railway.com/deployments/start-command)
[2] [Railway — Cron Jobs](https://docs.railway.com/cron-jobs)
