Obtener Municipios
El endpoint Municipios permite realizar búsquedas en todos los municipios disponibles en la base de datos. Este recurso es útil para obtener información precisa sobre municipios específicos, incluyendo su nombre, código y departamento correspondiente.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/municipalities

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

Parámetros de consulta
Query Params

Parámetro	Tipo	Descripción	Requerido
name	string	Nombre del municipio a buscar.	Opcional
Respuesta del Endpoint
Campo	Descripción
id	Identificador único del municipio.
code	Código del municipio.
name	Nombre del municipio.
department	Nombre del departamento al que pertenece el municipio.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": [
    {
      "id": 1,
      "code": "91263",
      "name": "El Encanto",
      "department": "Amazonas"
    },
    {
      "id": 2,
      "code": "91405",
      "name": "La Chorrera",
      "department": "Amazonas"
    },
    //mas municipios...
    {
      "id": 3,
      "code": "91407",
      "name": "La Pedrera",
      "department": "Amazonas"
    },
    {
      "id": 100,
      "code": "05647",
      "name": "San Andres De Cuerquia",
      "department": "Antioquia"
    }
  ]
}