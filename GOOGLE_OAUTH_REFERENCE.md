# Referencia de Google OAuth

Para un inicio de sesión web con Google, el servidor necesita un cliente OAuth de tipo **Web application**, un `client_id`, un `client_secret` y una URI de redirección autorizada que coincida exactamente con la URI enviada durante el flujo. El flujo de servidor debe usar autorización por código, generar y validar un parámetro `state` contra CSRF, intercambiar el código en el endpoint de tokens y validar la identidad mediante OpenID Connect. Para identificar de forma estable una cuenta Google debe utilizarse el claim `sub`; el correo se usa para restringir qué cuenta puede administrar zRabbit, no como identificador único. La aplicación solicitará únicamente los scopes `openid`, `email` y `profile`.

Fuentes oficiales: [Google OAuth para aplicaciones de servidor](https://developers.google.com/identity/protocols/oauth2/web-server) y [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
