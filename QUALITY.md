# Verificación de calidad

La interfaz se comprobó en vistas de escritorio y móvil. El catálogo, el carrito y el panel responden a tamaños reducidos sin depender de menús laterales fijos. La tienda emplea controles semánticos, etiquetas de formulario asociadas, textos alternativos administrables para las imágenes, estados deshabilitados para acciones no disponibles y nombres accesibles en botones de cantidad, carrito, edición y eliminación.

Las rutas de administración se validan tanto en la interfaz como en el servidor. Las pruebas automatizadas confirman que una visita sin sesión, un usuario autenticado sin rol administrativo y una solicitud a la lista de imágenes reciben rechazo. También se validan cantidades inválidas, productos no publicados y stock insuficiente antes de crear pedidos.

El contraste base usa tinta negra sobre superficies melocotón, blanco, menta, lila y amarillo. Los focos nativos del navegador se conservan en controles interactivos para uso con teclado.
