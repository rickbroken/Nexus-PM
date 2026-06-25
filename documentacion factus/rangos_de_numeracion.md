Introducción
El endpoint Rangos de Numeración permite obtener los rangos de numeración disponibles en la API de Factus. Este recurso es útil para obtener información precisa sobre los rangos de numeración de documentos específicos, incluyendo su prefijo, rango de numeración, resolución, fecha de inicio y fin, entre otros.

El rango de numeración es un parámetro que se debe usar al momento de crear un documento electrónico, este parámetro es requerido y se debe enviar el id del rango de numeración que se desea usar.

Nota

Si usted cuenta con un solo rango de numeración activo, el campo numbering_range_id del documento electrónico se puede omitir, de lo contrario debe especificar el id del campo que debe enviar.

Obtener rangos de numeración
El endpoint Rangos de Numeración permite obtener los rangos de numeración disponibles en la API de Factus. Este recurso es útil para obtener información precisa sobre los rangos de numeración de documentos específicos, incluyendo su prefijo, rango de numeración, resolución, fecha de inicio y fin, entre otros.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/numbering-ranges?filter[id]&filter[document]&filter[resolution_number]&filter[technical_key]&filter[is_active]

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

Query Params: Parámetros de Consulta
Parámetro	Descripción
filter[id]	ID del registro
filter[document]	Código de documento. Para ver los códigos de documento disponibles vea la tabla códigos de documentos
filter[resolution_number]	Número de resolución (solo para facturas y documentos soporte)
filter[technical_key]	Clave técnica (solo para facturas)
filter[is_active]	Estado del registro: 1 para activo, 0 para inactivo
Respuesta del Endpoint
Campo	Descripción
id	ID del rango de numeración
document	Nombre del documento
prefix	Prefijo del rango de numeración
from	Número de inicio del rango de numeración
to	Número del final del rango de numeración
current	Siguiente número dentro del rango de numeración
resolution_number	Número de resolución
start_date	Fecha en la que se expidió el rango de numeración
end_date	Fecha de vencimiento del rango de numeración
technical_key	Clave técnica
is_expired	El valor es 1 cuando el rango está vencido y 0 cuando está vigente
is_active	El valor es 1 cuando el rango está activo y 0 cuando está inactivo
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "data": [
      {
        "id": 5,
        "document": "Nota Crédito",
        "prefix": "NC",
        "from": 1,
        "to": 16000000,
        "current": 163,
        "resolution_number": null,
        "start_date": "2030-01-19",
        "end_date": "2030-01-19",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2023-06-01T08:00:38Z",
        "updated_at": "2025-07-15T09:20:04Z"
      },
      {
        "id": 62,
        "document": "Nota Crédito",
        "prefix": "NCC",
        "from": 1,
        "to": 10000,
        "current": 2,
        "resolution_number": null,
        "start_date": "2050-12-31",
        "end_date": "2050-12-31",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2024-11-14T09:56:39Z",
        "updated_at": "2025-08-08T13:36:03Z"
      },
      {
        "id": 6,
        "document": "Nota Débito",
        "prefix": "ND",
        "from": 1,
        "to": 16000000,
        "current": 59,
        "resolution_number": null,
        "start_date": "2030-01-19",
        "end_date": "2030-01-19",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2023-06-01T08:00:38Z",
        "updated_at": "2025-07-03T21:36:09Z"
      },
      {
        "id": 63,
        "document": "Nota Débito",
        "prefix": "NDD",
        "from": 1,
        "to": 10000,
        "current": 2,
        "resolution_number": null,
        "start_date": "2050-12-31",
        "end_date": "2050-12-31",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2024-11-14T10:08:07Z",
        "updated_at": "2024-11-14T10:08:43Z"
      },
      {
        "id": 9,
        "document": "Nota de Ajuste Documento Soporte",
        "prefix": "NDA",
        "from": 1,
        "to": 16000000,
        "current": 53,
        "resolution_number": null,
        "start_date": "2030-01-19",
        "end_date": "2030-01-19",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2023-06-07T14:07:06Z",
        "updated_at": "2025-07-03T21:46:49Z"
      },
      {
        "id": 12,
        "document": "Nómina",
        "prefix": "NEF",
        "from": 1,
        "to": 1000000,
        "current": 72,
        "resolution_number": null,
        "start_date": "2050-12-31",
        "end_date": "2050-12-31",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2023-09-04T21:38:20Z",
        "updated_at": "2025-07-31T10:21:03Z"
      },
      {
        "id": 61,
        "document": "Nota de eliminación de nómina",
        "prefix": "NEN",
        "from": 1,
        "to": 16000000,
        "current": 14,
        "resolution_number": null,
        "start_date": "2050-12-31",
        "end_date": "2050-12-31",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2024-10-02T16:12:12Z",
        "updated_at": "2025-06-13T15:34:51Z"
      },
      {
        "id": 4,
        "document": "Factura de Venta",
        "prefix": "SETP",
        "from": 990000000,
        "to": 995000000,
        "current": 990000875,
        "resolution_number": "18760000001",
        "start_date": "2030-01-19",
        "end_date": "2030-01-19",
        "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2023-06-01T08:00:38Z",
        "updated_at": "2025-08-01T11:26:26Z"
      },
      {
        "id": 67,
        "document": "Factura de talonario o de papel",
        "prefix": "FTP",
        "from": 990000000,
        "to": 995000000,
        "current": 990000017,
        "resolution_number": "18760000001",
        "start_date": "2030-01-19",
        "end_date": "2030-01-19",
        "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2024-02-09T16:12:05Z",
        "updated_at": "2025-01-14T21:43:04Z"
      },
      {
        "id": 8,
        "document": "Documento Soporte",
        "prefix": "SEDS",
        "from": 984000000,
        "to": 985000000,
        "current": 984000103,
        "resolution_number": "18760000009",
        "start_date": "2025-12-31",
        "end_date": "2025-12-31",
        "technical_key": null,
        "is_expired": false,
        "is_active": 1,
        "deleted_at": null,
        "created_at": "2023-06-05T09:34:11Z",
        "updated_at": "2025-07-03T21:39:44Z"
      }
    ],
    "pagination": {
      "total": 10,
      "per_page": 10,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 10,
      "links": [
        {
          "url": null,
          "label": "&laquo; Anterior",
          "active": false
        },
        {
          "url": "http://api.test/v1/numbering-ranges?page=1",
          "label": 1,
          "active": true,
          "page": 1
        },
        {
          "url": null,
          "label": "Siguiente &raquo;",
          "active": false,
          "page": 2
        }
      ]
    }
  }
}

Ver Rango
Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/numbering-ranges/:numbering_range_id

Este endpoint permite ver un rango de numeración en específico. Es útil para obtener información detallada sobre un rango de numeración en particular, incluyendo su prefijo, rango de numeración, resolución, fecha de inicio y fin, entre otros.

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

Respuesta del Endpoint
Campo	Descripción
id	ID del rango de numeración
document	Nombre del documento
prefix	Prefijo del rango de numeración
from	Número de inicio del rango de numeración
to	Número del final del rango de numeración
current	Siguiente número dentro del rango de numeración
resolution_number	Número de resolución
start_date	Fecha en la que se expidió el rango de numeración
end_date	Fecha de vencimiento del rango de numeración
technical_key	Clave técnica
is_expired	El valor es 1 cuando el rango está vencido y 0 cuando está vigente
is_active	El valor es 1 cuando el rango está activo y 0 cuando está inactivo
Variables de Ruta (Path Variables)
numbering_range_id ID del rango de numeración
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "id": 4,
    "document": "21",
    "document_name": "Factura de Venta",
    "prefix": "SEPT",
    "from": 990000000,
    "to": 995000000,
    "current": 990000295,
    "resolution_number": "18760000001",
    "start_date": "19-01-2019",
    "end_date": "19-01-2030",
    "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
    "is_expired": false,
    "is_active": 1,
    "created_at": "2023-06-01T08:00:38Z",
    "updated_at": "2024-09-10T10:31:50Z"
  }
}

Eliminar Rango
Este endpoint permite eliminar un rango de numeración en específico. Es útil para eliminar un rango de numeración en particular.

nota

Si el rango de numeración no se ha usado en algún documento este se eliminara permanentemente, si el rango se ha usado en algún documento solo se le agregara un estado de eliminado. Para ver los documentos con un estado de eliminado consulte el endpoint

Rangos

.

Método: DELETE

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/numbering-ranges/:numbering_range_id

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

Variables de Ruta (Path Variables)
numbering_range_id ID del rango de numeración
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Rango de numeración eliminado con éxito"
}Crear Rango
Este endpoint permite crear un rango de numeración en específico. Es útil para crear un rango de numeración en particular.

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/numbering-ranges

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

Request
ID	Value
document	Código de documento, para ver los códigos de documento que se pueden usar vea la siguiente tabla códigos de documentos
prefix	Prefijo del rango de numeración.
current	Número actual del consecutivo.
NOTA:
- Si el consecutivo se ha usado, debe agregar el número del último consecutivo usado.
resolution_number	Número de resolución del rango.
Solo es requerido si el campo document contiene el código 21, 24 o 30.
Response
ID	Description
id	ID del rango de numeración.
document	Código del documento.
document_name	Nombre del documento.
prefix	Prefijo del rango de numeración.
from	Número de inicio del rango de numeración.
to	Número final del rango de numeración.
current	Siguiente número del rango de numeración.
resolution_number	Número de resolución.
start_date	Fecha en la que se expidió el rango de numeración.
end_date	Fecha de vencimiento del rango de numeración.
technical_key	Clave técnica.
is_expired	El valor es 1 cuando el rango de numeración está vencido y 0 cuando está vigente.
is_active	El valor es 1 cuando el rango de numeración está activo y 0 cuando no está activo.
created_at	Fecha de creación.
updated_at	Fecha de actualización.
Ejemplo de respuesta
status 200
{
  "status": "Created",
  "message": "Rango de numeración creado con éxito",
  "data": {
    "id": 51,
    "document": "21",
    "document_name": "Factura de Venta",
    "prefix": "FV",
    "from": 1,
    "to": 1000,
    "current": 1,
    "resolution_number": "d3kd93kd39jd92",
    "start_date": "01-10-2024",
    "end_date": "01-04-2025",
    "technical_key": "dfs3dfs334d8d8s96s8d",
    "is_expired": true,
    "is_active": 0,
    "created_at": "2024-09-10T15:30:26Z",
    "updated_at": "2024-09-10T15:30:26Z"
  }
}

Actualizar consecutivo
Este endpoint permite actualizar el consecutivo de un rango de numeración en específico.

Método: PATCH

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/numbering-ranges/:numbering_range_id/current

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

Request
Campo	Descripción
current	Número actual del consecutivo.
Response
Campo	Descripción
id	ID del rango de numeración.
document	Código del documento.
document_name	Nombre del documento.
prefix	Prefijo del rango de numeración.
from	Número de inicio del rango de numeración.
to	Número final del rango de numeración.
current	Siguiente número del rango de numeración.
resolution_number	Número de resolución.
start_date	Fecha en la que se expidió el rango de numeración.
end_date	Fecha de vencimiento del rango de numeración.
technical_key	Clave técnica.
is_expired	El valor es 1 cuando el rango de numeración está vencido y 0 cuando está vigente.
is_active	El valor es 1 cuando el rango de numeración está activo y 0 cuando no está activo.
created_at	Fecha de creación.
updated_at	Fecha de actualización.
Variables de Ruta (Path Variables)
numbering_range_id ID del rango de numeración
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Rango de numeración actualizado con éxito",
  "data": {
    "id": 59,
    "document": "21",
    "document_name": "Factura de Venta",
    "prefix": "FV",
    "from": 1,
    "to": 1000,
    "current": 1,
    "resolution_number": "d3kd93kd39jd92",
    "start_date": "01-10-2024",
    "end_date": "01-04-2025",
    "technical_key": "dfs3dfs334d8d8s96s8d",
    "is_expired": true,
    "is_active": 1,
    "created_at": "2024-09-10T15:56:22Z",
    "updated_at": "2024-09-10T17:35:56Z"
  }
}

Rangos asociados al software
El endpoint Rangos Asociados al Software permite obtener los rangos de numeración asociados al software.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/numbering-ranges/dian

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

Response
La consulta devuelve un array con los rangos de numeración asociados al software.

Tabla de Valores del Consecutivo
Campo	Descripción
prefix	Prefijo.
from	Número de inicio del consecutivo.
to	Número del final del consecutivo.
resolution_number	Número de resolución.
start_date	Fecha de expedición.
end_date	Fecha de vencimiento.
technical_key	Clave técnica.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": [
    {
      "resolution_number": "18760000007",
      "prefix": "SEDS",
      "from": "984000000",
      "to": "985000000",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "technical_key": ""
    }
  ]
}