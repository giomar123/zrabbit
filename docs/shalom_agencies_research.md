# Búsqueda de agencias Shalom

Fecha de verificación: 15 de agosto de 2026.

La página oficial de Shalom en `https://agencias.shalom.pe/` muestra el mensaje “Encuentra tu agencia más cercana” y un mapa basado en Leaflet. La página carga públicamente los recursos `https://serviceswebapi.shalomcontrol.com/api/v1/web/agencias/version` y `https://serviceswebapi.shalomcontrol.com/api/v1/web/agencias/listar`.

La integración de zRabbit debe tratar esas fuentes como datos externos no garantizados: solo mostrará las agencias recibidas desde el directorio oficial, permitirá que el cliente seleccione una y conservará la elección exacta en el pedido. No se inventarán agencias, horarios o distancias. La distancia se calculará únicamente cuando exista una ubicación verificable de la agencia y el cliente autorice la geolocalización o ingrese una dirección/distrito.

Antes de depender de este directorio en producción, se deberá comprobar que la respuesta permita consultas públicas consistentes y respetar los términos de Shalom. Como alternativa segura, el checkout enlazará al buscador oficial para que el cliente contraste la sede seleccionada.

La consulta directa de `agencias/listar` desde el navegador respondió `403` y devolvió un cuerpo marcado como cifrado. Por ello zRabbit no intentará descifrar, automatizar ni reutilizar esa API sin documentación/autorización de Shalom. La selección de cercanía se basará en resultados visibles de Google Maps Places y mantendrá un enlace al buscador oficial de Shalom como contraste.
