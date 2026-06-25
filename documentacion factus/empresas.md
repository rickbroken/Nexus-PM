Ver Empresa
Este endpoint permite ver la Información de la empresa del usuario correspondiente

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/company

Nota

Es necesario el envío del token de acceso <access_token> para hacer uso de este endpoint. Para ver cómo generar el token, vea Cómo generar un token de acceso .
Recuerde: El token de acceso caduca cada hora.
Encabezados de la Solicitud
Para realizar la solicitud es necesario incluir los siguientes encabezados:

Encabezado	Valor	Descripción
Content-Type	application/json	Indica que los datos se envían en formato JSON.
Authorization	Bearer <token_de_acceso>	Token de autenticación necesario para acceder al recurso. Ver Cómo generar token
Accept	application/json	Indica que la respuesta debe estar en formato JSON.
Nota: Reemplaza <token_de_acceso> con el token proporcionado tras autenticarte.

status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "url_logo": "http://api.test/storage/images/logos/IURT3at1baB4a7YHgmDPDCoaLJAPxsmJ3eQQeVBq.png",
    "nit": "900825759",
    "dv": "7",
    "company": "",
    "trade_name": "",
    "names": "ALAN",
    "surnames": "TURING",
    "graphic_representation_name": "ALAN TURING",
    "registration_code": "",
    "economic_activity": 6920,
    "phone": "0987654321",
    "email": "alanturing@enigmasas.com",
    "address": "calle 100 #50-80",
    "tribute": {
      "code": "ZZ",
      "name": "No aplica"
    },
    "legal_organization": {
      "code": "2",
      "name": "Persona Natural"
    },
    "municipality": {
      "code": "68872",
      "name": "Villanueva",
      "department": {
        "code": "68",
        "name": "Santander"
      }
    },
    "responsibilities": [
      {
        "code": "R-99-PN",
        "name": "No responsable"
      }
    ],
    "created_at": "2025-07-23T12:33:22Z",
    "updated_at": "2025-09-22T10:58:07Z"
  }
}

Actualizar Empresa
Este endpoint permite actualizar la Información de la empresa del usuario correspondiente

Método: PUT

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/company

Nota

Es necesario el envío del token de acceso <access_token> para hacer uso de este endpoint. Para ver cómo generar el token, vea Cómo generar un token de acceso .
Recuerde: El token de acceso caduca cada hora.
Encabezados de la Solicitud
Para realizar la solicitud es necesario incluir los siguientes encabezados:

Encabezado	Valor	Descripción
Content-Type	application/json	Indica que los datos se envían en formato JSON.
Authorization	Bearer <token_de_acceso>	Token de autenticación necesario para acceder al recurso. Ver Cómo generar token
Accept	application/json	Indica que la respuesta debe estar en formato JSON.
Nota: Reemplaza <token_de_acceso> con el token proporcionado tras autenticarte.

Parámetros del cuerpo (Body)
El cuerpo (Body) de la solicitud debe incluir los siguientes parámetros:

Nota

La información ingresada en estos campos debe corresponder a la registrada en el RUT

Parámetro y Tipo	Descripción
legal_organization_code (string)	Código que corresponda al tipo de organización. Para saber el código correspondiente consulte la tabla. Código de los tipos de organizaciones.
company (string)	(Opcional) Nombre de la empresa. Este campo es requerido si el campo legal_organization_code contiene el valor de 1 (Persona jurídica).
trade_name (string)	(Opcional) Nombre comercial.
names (string)	(Opcional) Nombres de la persona. Este campo es requerido si el campo legal_organization_code contiene el valor de 2 (Persona natural).
surnames (string)	(Opcional) Apellidos de la persona. Este campo es requerido si el campo legal_organization_code contiene el valor de 2 (Persona natural).
registration_code (string)	(Opcional) Código de registro mercantil.
economic_activity (string)	Código de la actividad economica principal.
phone (string)	Numero de teléfono.
email (string)	Correo electrónico.
address (string)	Dirección.
tribute_code (string)	Código del tributo. Para saber el código corresponde al tributo consulte la tabla de Tributos .
municipality_code (string)	Código del municipio. Para saber el código corresponde al municipio consulte el endpoint de Municipios .
responsibilities (string)	ID de los tipos de responsabilidad fiscal para saber los tipos de responsabilidades consulte la tabla Responsabilidades fiscales.
Ejemplo de solicitud
200 -Empresa
{
  "company": null,
  "names": "Alan",
  "surnames": "Turing",
  "responsibilities": "5",
  "economic_activity": "6920",
  "email": "alanturing@enigmasas.com",
  "address": "calle 100 #50-80",
  "trade_name": null,
  "registration_code": null,
  "phone": "0987654321",
  "municipality_code": "68872",
  "tribute_code": "ZZ",
  "legal_organization_code": "2"
}

Ejemplo de la respuesta
200 - Empresa
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "url_logo": "http://api.test/storage/images/logos/IURT3at1baB4a7YHgmDPDCoaLJAPxsmJ3eQQeVBq.png",
    "nit": "900825759",
    "dv": "7",
    "company": "",
    "trade_name": "",
    "names": "ALAN",
    "surnames": "TURING",
    "graphic_representation_name": "ALAN TURING",
    "registration_code": "",
    "economic_activity": 6920,
    "phone": "0987654321",
    "email": "alanturing@enigmasas.com",
    "address": "calle 100 #50-80",
    "tribute": {
      "code": "ZZ",
      "name": "No aplica"
    },
    "legal_organization": {
      "code": "2",
      "name": "Persona Natural"
    },
    "municipality": {
      "code": "68872",
      "name": "Villanueva",
      "department": {
        "code": "68",
        "name": "Santander"
      }
    },
    "responsibilities": [
      {
        "code": "R-99-PN",
        "name": "No responsable"
      }
    ],
    "created_at": "2025-07-23T12:33:22Z",
    "updated_at": "2025-09-22T10:58:07Z"
  }
}

Actualizar Logo de la empresa
Este endpoint permite actualizar el logo de la empresa del usuario correspondiente

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/company/logo

Nota

Es necesario el envío del token de acceso <access_token> para hacer uso de este endpoint. Para ver cómo generar el token, vea Cómo generar un token de acceso .
Recuerde: El token de acceso caduca cada hora.
Encabezados de la Solicitud
Para realizar la solicitud es necesario incluir los siguientes encabezados:

Encabezado	Valor	Descripción
Content-Type	multipart/form-data	Indica que los datos se envían en formato JSON.
Authorization	Bearer <token_de_acceso>	Token de autenticación necesario para acceder al recurso. Ver Cómo generar token
Accept	application/json	Indica que la respuesta debe estar en formato JSON.
Nota: Reemplaza <token_de_acceso> con el token proporcionado tras autenticarte.

Parámetros
La solicitud debe incluir los siguientes parámetros:

Parámetro	Descripción
image	Archivo de tipo png, jpg o jpeg por el cual desee actualizar el logo.
Ejemplo de la respuesta
200 - Empresa
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "url_log": "http://api.test/storage/images/logos/Gnl69DPy9V1oJ6gUH8mZpucg3BTbqpmWqAoPmJkj.jpg"
  }
}