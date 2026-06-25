Introducción a la autenticación

Nuestra API Factus usa el sistema de autenticación OAuth2, el cual utiliza las credenciales de acceso al sistema suministradas por Factus para generar un token de acceso, el cual debe usarse para realizar cualquier petición a los endpoints, tener en cuenta que se dará acceso con un limite tiempo valido por cada token y tendrá que hacer uso del token de refresco para generar uno nuevo. Puede ver mas información en el siguiente link OAuth2

Pruebas URL: https://api-sandbox.factus.com.co/oauth/token
Produccion URL: https://api.factus.com.co/oauth/token
Parámetros del Cuerpo de Solicitud
El cuerpo de la solicitud debe enviarse como form-data e incluir los siguientes parámetros obligatorios:

Parámetro	Descripción	Ejemplo
grant_type	Tipo de autenticación	password
client_id	Identificador único del cliente	tu client id
client_secret	Secreto asociado al cliente	tu client secret
username	Correo electrónico del usuario	tu username
password	Contraseña del usuario	tu password
Ejemplo de Solicitud
A continuación, se muestra un ejemplo de cómo enviar una solicitud al endpoint:

Laravel php
Node js
Curl
    const axios = require('axios');
    const qs = require('qs');  // Para enviar datos en formato `application/x-www-form-urlencoded`

    // Datos de la solicitud
    const data = qs.stringify({
    grant_type: 'password',
    client_id: 'tu client id',
    client_secret: 'tu client secret',
    username: 'tu username',
    password: 'tu password'
    });

    // Configuración de la solicitud
    const config = {
    method: 'post',
    url: 'https://api-sandbox.factus.com.co/oauth/token',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
    };

    // Realizando la solicitud POST
    axios(config)
    .then((response) => {
        console.log('Token de acceso:', response.data.access_token);
        console.log('Token de actualización:', response.data.refresh_token);
    })
    .catch((error) => {
        console.error('Error en la solicitud:', error.response ? error.response.data : error.message);
    });

Response Success
Status: 200 OK

{
  "token_type": "Bearer",
  "expires_in": 600,
  "access_token": "tu access token",
  "refresh_token": "tu refresh token"
}


Refresh Token
Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/oauth/token

Descripción
Este endpoint permite actualizar el token de acceso mediante el uso de un refresh token previamente generado.

Encabezados (Headers)
A continuación se describen los encabezados necesarios para realizar la solicitud:

Encabezado	Valor	Descripción
Authorization	Bearer Token	Este debe ser proporcionado previamente al realizar el inicio de sesión o autenticar al usuario.
Accept	application/json	Indica que la respuesta debe estar en formato JSON.
Cuerpo de la Solicitud (Body)
La solicitud debe enviarse en formato form-data. A continuación se detallan los parámetros requeridos:

Parámetro	Descripción	Valor Ejemplo
grant_type	Tipo de concesión, debe ser refresh_token	refresh_token
client_id	ID del cliente proporcionado por el servicio	tu client id
client_secret	Secreto del cliente proporcionado por el servicio	tu client secret
refresh_token	El refresh token previamente generado	tu refresh token
Ejemplo de Solicitud
A continuación, se muestra un ejemplo de cómo enviar una solicitud al endpoint:

Laravel php
Node js
Curl
    const axios = require('axios');

    async function refreshToken() {
        const url = 'https://api-sandbox.factus.com.co/oauth/token';

        // Parámetros necesarios para la solicitud
        const data = new URLSearchParams();
        data.append('grant_type', 'refresh_token');
        data.append('client_id', 'tu client id');
        data.append('client_secret', 'tu client secret');
        data.append('refresh_token', 'tu refresh token');

        try {
            // Realizar la solicitud POST
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            // Verificar que la respuesta contiene el access_token
            const { access_token, expires_in } = response.data;

            if (access_token) {
                // Mostrar los tokens (o devolverlos como respuesta)
                console.log('Access Token:', access_token);
                console.log('Expires In:', expires_in);
                return {
                    access_token: access_token,
                    expires_in: expires_in
                };
            } else {
                throw new Error('No se pudo obtener el access_token');
            }
        } catch (error) {
            // Manejo de errores en caso de que falle la solicitud
            console.error('Error al obtener el token:', error.response ? error.response.data : error.message);
            return {
                error: 'Error al obtener el token',
                message: error.response ? error.response.data : error.message,
            };
        }
    }

    // Llamar a la función
    refreshToken();

Response Success
Status: 200 OK

{
    "token_type": "Bearer",
    "expires_in": 3600,
    "access_token": "tu access token",
    "refresh_token": "tu refresh token"
}