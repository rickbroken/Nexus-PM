Obtener datos de adquirientes
El endpoint Obtener datos de adquirientes permite consultar el nombre o razón social y la dirección de correo electrónico asociada a un adquiriente, utilizando como criterios de búsqueda el tipo y número de documento.

La DIAN ha implementado un nuevo servicio de consulta para completar la información de adquirientes con el objetivo de facilitar y agilizar la generación de facturas electrónicas.

Un comprador solo tendrá que indicar su tipo y número de documento y, con esta información, el servicio completará automáticamente los datos necesarios para generar la factura, como su nombre y correo electrónico, sin necesidad de ingresarlos manualmente.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/dian/acquirer?identification_document_id=&identification_number=

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
https://api-sandbox.factus.com.co/v1/dian/acquirer?identification_document_id=3&identification_number=1399995

Parámetro	Descripción
identification_document_id	ID que corresponda al tipo de identificación. Para saber cual ID corresponde al tipo de identificación consulte la siguiente tabla IDs tipos de documentos.
identification_number	Número de documento del adquiriente.
Nota

Aquí encontraras datos para realizar pruebas en sandbox.

Datos de prueba
Response
La consulta devuelve un objecto con el nombre y correo del adquiriente.

Campo	Descripción
name	Nombre del adquiriente.
email	Email del adquiriente.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "name": "Nombre Cédula de ciudadanía 5",
    "email": "Mail_Cédula de ciudadanía_5@mail.com"
  }
}

Datos de prueba
Estos son los datos de ejemplo proporcionados por la DIAN, destinados exclusivamente para realizar consultas y pruebas en entornos de prueba.

ID de documento	Número de documento	Nombre o Razón Social	Correo de recepción de factura electrónica
1	1199991	Nombre Registro civil 1	Mail_Registro civil_1@mail.com
1	1199992	Nombre Registro civil 2	Mail_Registro civil_2@mail.com
1	1199993	Nombre Registro civil 3	Mail_Registro civil_3@mail.com
1	1199994	Nombre Registro civil 4	Mail_Registro civil_4@mail.com
1	1199995	Nombre Registro civil 5	Mail_Registro civil_5@mail.com
1	1199996	Nombre Registro civil 6	Mail_Registro civil_6@mail.com
1	1199997	Nombre Registro civil 7	Mail_Registro civil_7@mail.com
1	1199998	Nombre Registro civil 8	Mail_Registro civil_8@mail.com
1	1199999	Nombre Registro civil 9	Mail_Registro civil_9@mail.com
1	11999910	Nombre Registro civil 10	Mail_Registro civil_10@mail.com
2	1299991	Nombre Tarjeta de identidad 1	Mail_Tarjeta de identidad_1@mail.com
2	1299992	Nombre Tarjeta de identidad 2	Mail_Tarjeta de identidad_2@mail.com
2	1299993	Nombre Tarjeta de identidad 3	Mail_Tarjeta de identidad_3@mail.com
2	1299994	Nombre Tarjeta de identidad 4	Mail_Tarjeta de identidad_4@mail.com
2	1299995	Nombre Tarjeta de identidad 5	Mail_Tarjeta de identidad_5@mail.com
2	1299996	Nombre Tarjeta de identidad 6	Mail_Tarjeta de identidad_6@mail.com
2	1299997	Nombre Tarjeta de identidad 7	Mail_Tarjeta de identidad_7@mail.com
2	1299998	Nombre Tarjeta de identidad 8	Mail_Tarjeta de identidad_8@mail.com
2	1299999	Nombre Tarjeta de identidad 9	Mail_Tarjeta de identidad_9@mail.com
2	12999910	Nombre Tarjeta de identidad 10	Mail_Tarjeta de identidad_10@mail.com
3	1399991	Nombre Cédula de ciudadanía 1	Mail_Cédula de ciudadanía_1@mail.com
3	1399992	Nombre Cédula de ciudadanía 2	Mail_Cédula de ciudadanía_2@mail.com
3	1399993	Nombre Cédula de ciudadanía 3	Mail_Cédula de ciudadanía_3@mail.com
3	1399994	Nombre Cédula de ciudadanía 4	Mail_Cédula de ciudadanía_4@mail.com
3	1399995	Nombre Cédula de ciudadanía 5	Mail_Cédula de ciudadanía_5@mail.com
3	1399996	Nombre Cédula de ciudadanía 6	Mail_Cédula de ciudadanía_6@mail.com
3	1399997	Nombre Cédula de ciudadanía 7	Mail_Cédula de ciudadanía_7@mail.com
3	1399998	Nombre Cédula de ciudadanía 8	Mail_Cédula de ciudadanía_8@mail.com
3	1399999	Nombre Cédula de ciudadanía 9	Mail_Cédula de ciudadanía_9@mail.com
3	13999910	Nombre Cédula de ciudadanía 10	Mail_Cédula de ciudadanía_10@mail.com
4	2199991	Nombre Tarjeta de extranjería 1	Mail_Tarjeta de extranjería_1@mail.com
4	2199992	Nombre Tarjeta de extranjería 2	Mail_Tarjeta de extranjería_2@mail.com
4	2199993	Nombre Tarjeta de extranjería 3	Mail_Tarjeta de extranjería_3@mail.com
4	2199994	Nombre Tarjeta de extranjería 4	Mail_Tarjeta de extranjería_4@mail.com
4	2199995	Nombre Tarjeta de extranjería 5	Mail_Tarjeta de extranjería_5@mail.com
4	2199996	Nombre Tarjeta de extranjería 6	Mail_Tarjeta de extranjería_6@mail.com
4	2199997	Nombre Tarjeta de extranjería 7	Mail_Tarjeta de extranjería_7@mail.com
4	2199998	Nombre Tarjeta de extranjería 8	Mail_Tarjeta de extranjería_8@mail.com
4	2199999	Nombre Tarjeta de extranjería 9	Mail_Tarjeta de extranjería_9@mail.com
4	21999910	Nombre Tarjeta de extranjería 10	Mail_Tarjeta de extranjería_10@mail.com
5	2299991	Nombre Cédula de extranjería 1	Mail_Cédula de extranjería_1@mail.com
5	2299992	Nombre Cédula de extranjería 2	Mail_Cédula de extranjería_2@mail.com
5	2299993	Nombre Cédula de extranjería 3	Mail_Cédula de extranjería_3@mail.com
5	2299994	Nombre Cédula de extranjería 4	Mail_Cédula de extranjería_4@mail.com
5	2299995	Nombre Cédula de extranjería 5	Mail_Cédula de extranjería_5@mail.com
5	2299996	Nombre Cédula de extranjería 6	Mail_Cédula de extranjería_6@mail.com
5	2299997	Nombre Cédula de extranjería 7	Mail_Cédula de extranjería_7@mail.com
5	2299998	Nombre Cédula de extranjería 8	Mail_Cédula de extranjería_8@mail.com
5	2299999	Nombre Cédula de extranjería 9	Mail_Cédula de extranjería_9@mail.com
5	22999910	Nombre Cédula de extranjería 10	Mail_Cédula de extranjería_10@mail.com
6	3199991	Nombre NIT 1	Mail_NIT_1@mail.com
6	3199992	Nombre NIT 2	Mail_NIT_2@mail.com
6	3199993	Nombre NIT 3	Mail_NIT_3@mail.com
6	3199994	Nombre NIT 4	Mail_NIT_4@mail.com
6	3199995	Nombre NIT 5	Mail_NIT_5@mail.com
6	3199996	Nombre NIT 6	Mail_NIT_6@mail.com
6	3199997	Nombre NIT 7	Mail_NIT_7@mail.com
6	3199998	Nombre NIT 8	Mail_NIT_8@mail.com
6	3199999	Nombre NIT 9	Mail_NIT_9@mail.com
6	31999910	Nombre NIT 10	Mail_NIT_10@mail.com
7	4199991	Nombre Pasaporte 1	Mail_Pasaporte_1@mail.com
7	4199992	Nombre Pasaporte 2	Mail_Pasaporte_2@mail.com
7	4199993	Nombre Pasaporte 3	Mail_Pasaporte_3@mail.com
7	4199994	Nombre Pasaporte 4	Mail_Pasaporte_4@mail.com
7	4199995	Nombre Pasaporte 5	Mail_Pasaporte_5@mail.com
7	4199996	Nombre Pasaporte 6	Mail_Pasaporte_6@mail.com
7	4199997	Nombre Pasaporte 7	Mail_Pasaporte_7@mail.com
7	4199998	Nombre Pasaporte 8	Mail_Pasaporte_8@mail.com
7	4199999	Nombre Pasaporte 9	Mail_Pasaporte_9@mail.com
7	41999910	Nombre Pasaporte 10	Mail_Pasaporte_10@mail.com
8	4299991	Nombre Documento de identificación extranjero 1	Mail_Documento de identificación extranjero_1@mail.com
8	4299992	Nombre Documento de identificación extranjero 2	Mail_Documento de identificación extranjero_2@mail.com
8	4299993	Nombre Documento de identificación extranjero 3	Mail_Documento de identificación extranjero_3@mail.com
8	4299994	Nombre Documento de identificación extranjero 4	Mail_Documento de identificación extranjero_4@mail.com
8	4299995	Nombre Documento de identificación extranjero 5	Mail_Documento de identificación extranjero_5@mail.com
8	4299996	Nombre Documento de identificación extranjero 6	Mail_Documento de identificación extranjero_6@mail.com
8	4299997	Nombre Documento de identificación extranjero 7	Mail_Documento de identificación extranjero_7@mail.com
8	4299998	Nombre Documento de identificación extranjero 8	Mail_Documento de identificación extranjero_8@mail.com
8	4299999	Nombre Documento de identificación extranjero 9	Mail_Documento de identificación extranjero_9@mail.com
8	42999910	Nombre Documento de identificación extranjero 10	Mail_Documento de identificación extranjero_10@mail.com
10	5099991	Nombre NIT de otro país 1	Mail_NIT de otro país_1@mail.com
10	5099992	Nombre NIT de otro país 2	Mail_NIT de otro país_2@mail.com
10	5099993	Nombre NIT de otro país 3	Mail_NIT de otro país_3@mail.com
10	5099994	Nombre NIT de otro país 4	Mail_NIT de otro país_4@mail.com
10	5099995	Nombre NIT de otro país 5	Mail_NIT de otro país_5@mail.com
10	5099996	Nombre NIT de otro país 6	Mail_NIT de otro país_6@mail.com
10	5099997	Nombre NIT de otro país 7	Mail_NIT de otro país_7@mail.com
10	5099998	Nombre NIT de otro país 8	Mail_NIT de otro país_8@mail.com
10	5099999	Nombre NIT de otro país 9	Mail_NIT de otro país_9@mail.com
10	50999910	Nombre NIT de otro país 10	Mail_NIT de otro país_10@mail.com
11	9199991	Nombre NUIP * 1	Mail_NUIP *_1@mail.com
11	9199992	Nombre NUIP * 2	Mail_NUIP *_2@mail.com
11	9199993	Nombre NUIP * 3	Mail_NUIP *_3@mail.com
11	9199994	Nombre NUIP * 4	Mail_NUIP *_4@mail.com
11	9199995	Nombre NUIP * 5	Mail_NUIP *_5@mail.com
11	9199996	Nombre NUIP * 6	Mail_NUIP *_6@mail.com
11	9199997	Nombre NUIP * 7	Mail_NUIP *_7@mail.com
11	9199998	Nombre NUIP * 8	Mail_NUIP *_8@mail.com
11	9199999	Nombre NUIP * 9	Mail_NUIP *_9@mail.com
11	91999910	Nombre NUIP * 10	Mail_NUIP *_10@mail.com