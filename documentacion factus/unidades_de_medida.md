Unidades de medida
Busca unidades de medida utilizando un parámetro opcional (name) para filtrar resultados.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/measurement-units

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

Query Parameters
Key	Descripción
name	Nombre de la unidad de medida
Respuesta
La respuesta contiene los siguientes valores:

Campo	Descripción
id	ID de la unidad de medida
code	Código de la unidad de medida
name	Nombre de la unidad de medida
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": [
    {
      "id": 70,
      "code": "94",
      "name": "unidad"
    },
    {
      "id": 414,
      "code": "KGM",
      "name": "kilogramo"
    },
    {
      "id": 449,
      "code": "LBR",
      "name": "libra"
    },
    {
      "id": 512,
      "code": "MTR",
      "name": "metro"
    },
    {
      "id": 874,
      "code": "GLL",
      "name": "galón"
    }
  ]
}