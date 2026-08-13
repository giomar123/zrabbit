# Validación del panel de administración

La vista previa autenticada del proyecto fue comprobada en las cuatro rutas del panel: `/admin`, `/admin?tab=users`, `/admin?tab=orders` y `/admin?tab=account`. Las capturas mostraron la sesión de administrador, la navegación horizontal, el inventario real con Pikachu Select, la tabla de usuarios registrados, los pedidos reales con sus productos y el perfil de la cuenta.

También se verificó la adaptación móvil de `/admin`: la navegación se mantiene desplazable horizontalmente y los formularios, tablas y botones preservan legibilidad. De forma separada, una navegación sin sesión a `/admin` mostró el estado **Acceso restringido**; las pruebas automatizadas además confirman que usuarios no administradores no pueden consultar datos, gestionar imágenes ni reducir/eliminar su propio acceso administrativo.
