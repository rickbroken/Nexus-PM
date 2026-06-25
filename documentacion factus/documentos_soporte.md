Introducción
¿Qué es el documento soporte?
Es el documento que soporta la compra de un bien o la prestación de un servicio cuando el proveedor es un sujeto no obligado a expedir factura electrónica.

El comprador debe realizar este documento para soportar la transacción que da lugar a costos, deducciones o impuestos descontables, por medio de un documento con numeración autorizada por la DIAN.

¿Quién lo debe emitir?
El comprador del bien o del servicio

¿Cuándo se usa?
Lo generas como comprador para documentar la transacción que da lugar a costos, deducciones o impuestos descontables, por medio de un documento con numeración autorizada por la DIAN, cuando el vendedor o prestador del servicio no está obligado a facturar.

Crear Documento Soporte
Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/support-documents/validate

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

Endpoints para Datos de documentos soporte
Factus ofrece una serie de endpoints de apoyo diseñados para simplificar el proceso de creación de documentos soporte. Estos datos son de uso recurrente y, dado que rara vez se actualizan, se recomienda almacenarlos de manera persistente en su sistema. Esto no solo evita consultas repetitivas, sino que también mejora significativamente los tiempos de respuesta. Sin embargo, si opta por consultarlos dinámicamente, es importante evaluar el impacto en el rendimiento del sistema.

Rangos de numeración
Municipios
Tributos
Unidades de medida
Paises
Nota: Para el rango de numeración es necesario seleccionar el id del rango correspondiente a documentos soporte y que el campo is_active sea 1 (activo)
Estructura para crear el documento soporte
Para crear un documento soporte en Factus API debemos tener en cuenta los datos agrupados en 3 aspectos:

Datos generales del documento soporte
Datos del proveedor
Datos de los productos o servicios.
Parámetros del Cuerpo (Body)
El cuerpo (Body) de la solicitud debe enviarse en formato JSON y debe incluir los siguientes parámetros:

Descripción del body
ID/Valor	Descripción
reference_code	Código único que sirve para identificar cada documento soporte de manera unívoca en el sistema y garantizar que no haya duplicados. Esto nos ayuda a prevenir que se genere más de un documento soporte con la misma información.
numbering_range_id	ID del rango de numeración. Para conocer el ID de cada rango de numeración, consulta el siguiente endpoint: rangos de numeración . Si en la API solo hay un rango de numeración activo para los documentos soporte, este campo es opcional. En caso de no enviarlo, la API utilizará automáticamente el único rango activo. Si existen múltiples rangos de numeración para los documentos soporte, este campo es obligatorio.
payment_method_code	(Opcional) Código del método de pago. Si el medio de pago no se agrega, por defecto la API agrega el código 10 (efectivo). Para saber cuál es el código de cada método de pago, consulte la siguiente tabla: Métodos de pago .
observation	Agrega una observación. No debe tener más de 250 caracteres.
provider{}	Este es un objeto que contendrá la información del proveedor del bien o servicio del documento soporte.
provider.identification_document_id	ID que corresponda al tipo de identificación. Para saber cuál ID corresponde al tipo de identificación, consulte la siguiente tabla: IDs tipos de documentos .
provider.identification	Número de identificación del proveedor.
provider.dv	(Opcional) Dígito de verificación del proveedor. Requerido si el proveedor se identifica con NIT.
provider.trade_name	(Opcional) Nombre comercial.
provider.names	Nombre del proveedor.
provider.address	Dirección del proveedor.
provider.email	Dirección del correo electrónico del proveedor.
provider.phone	(Opcional) Número de teléfono del proveedor.
provider.country_code	Código del país donde reside el proveedor. Para saber cuál código corresponde a cada país, consulte el siguiente endpoint: Países .
provider.municipality_id	(Opcional) ID que corresponda al municipio donde reside el proveedor. Para saber cuál ID corresponde al municipio, consulte el siguiente endpoint: Municipios . Nota: Se debe enviar ID del municipio únicamente si el campo provider.country_code es igual a CO, de lo contrario, este campo es opcional.
items{}	(Array) Corresponde a los productos o servicios del documento soporte. Se debe enviar un objeto por cada producto o servicio.
item.*.code_reference	Código de referencia del producto o servicio.
item.*.name	Nombre del producto o servicio.
item.*.quantity	Cantidad del producto o servicio. Debe ser un número entero.
item.*.discount_rate	Porcentaje del descuento del producto o servicio.
item.*.price	Precio del producto o servicio.
item.*.unit_measure_id	ID que corresponda a la unidad de medida del item. Para saber qué ID corresponde a cada unidad de medida, consulte el siguiente endpoint: Unidades de medida .
item.*.standard_code_id	ID que corresponde al código de estándar adoptado para los productos o servicios. Para saber qué ID corresponde al código de estándar, consulte la siguiente tabla: IDs de códigos de estándar .
items.*withholding_taxes[]	(Opcional) Array de objetos (autorretenciones) Este campo sirve para informar las retenciones en la fuente que se aplican al producto o servicio.
No son retenciones que otra persona o empresa te hace a ti, sino retenciones que tú mismo te aplicas como contribuyente.
Por cada retención que te apliques a ti mismo, debes enviar un objeto.
items.*.withholding_taxes.*.code	Código de la retención aplicada al producto o servicio. Para saber el código de la retención, consulte el siguiente endpoint: Tributos de productos .
items.*.withholding_taxes.*.withhoding_tax_rate	Porcentaje de la retención aplicada al item.
Ejemplo de Solicitud
Aquí tienes un ejemplo de cómo debería quedar el cuerpo de la solicitud en formato JSON:

201 - Documento Soporte
{
  "reference_code": "REF0017",
  "numbering_range_id": 148,
  "payment_method_code": "10",
  "observation": "",
  "provider": {
    "identification_document_id": 6,
    "identification": "123456789",
    "dv": 6,
    "trade_name": "",
    "names": "Alan Turing",
    "address": "calle 1 # 2-68",
    "email": "alanturing@enigmasas.com",
    "phone": "1234567890",
    "is_resident": 1,
    "country_code": "CO",
    "municipality_id": 980
  },
  "items": [
    {
      "code_reference": "12345",
      "name": "producto de prueba",
      "quantity": 1,
      "discount_rate": 20,
      "price": 50000,
      "unit_measure_id": 70,
      "standard_code_id": 1,
      "withholding_taxes": [
        {
          "code": "06",
          "withholding_tax_rate": "3.50"
        }
      ]
    },
    {
      "code_reference": "54321",
      "name": "producto de prueba 2",
      "quantity": 1,
      "discount_rate": 0,
      "price": 50000,
      "unit_measure_id": 70,
      "standard_code_id": 1
    }
  ]
}

Ejemplo de respuesta
status 201 - Documento Soporte
Status 409
Status 422
{
  "status": "Created",
  "message": "Documento con el código de referencia REF0017 registrado y validado con éxito",
  "data": {
    "company": {
      "url_logo": "http://api-sandbox.factus.com.co/storage/images/logos/lC5CLGXHgwlv8slaoiKC6dHkVLIXQVaDkL9C1Yqc.png",
      "nit": "901724254",
      "dv": "1",
      "company": "FACTUS S.A.S.",
      "name": "FACTUS S.A.S.",
      "graphic_representation_name": "FACTUS S.A.S.",
      "registration_code": "bnnmbvncv",
      "economic_activity": "6201",
      "phone": "3133045345",
      "email": "FACTUSFACTURACION@GMAIL.COM",
      "direction": "CARRERA 10 # 9 - 04",
      "municipality": "San Gil"
    },
    "provider": {
      "identification": "123456789",
      "dv": "6",
      "graphic_representation_name": "Alan Turing",
      "trade_name": null,
      "names": "Alan Turing",
      "address": "calle 1 # 2-68",
      "email": "alanturing@enigmasas.com",
      "phone": "1234567890",
      "identification_document": {
        "id": 6,
        "code": "31",
        "name": "NIT"
      },
      "legal_organization": {
        "id": 2,
        "code": "2",
        "name": "Persona Natural"
      },
      "tribute": {
        "id": 21,
        "code": "ZZ",
        "name": "No aplica"
      },
      "country": {
        "id": 46,
        "code": "CO",
        "name": "Colombia"
      },
      "municipality": {
        "id": 980,
        "code": "68679",
        "name": "San Gil"
      }
    },
    "support_document": {
      "id": 6,
      "number": "SEDS984000021",
      "reference_code": "REF0017",
      "status": 1,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=69f218c3601e279d9d47d091fe1c2d85e2b727a9576811d7a561d16313860799f26e8b0c8ae9f68db7a61a7234329f06",
      "cuds": "69f218c3601e279d9d47d091fe1c2d85e2b727a9576811d7a561d16313860799f26e8b0c8ae9f68db7a61a7234329f06",
      "validated": "11-02-2025 10:16:23 PM",
      "gross_value": "90000.00",
      "taxable_amount": "0.00",
      "tax_amount": "0.00",
      "total": "90000.00",
      "observation": null,
      "errors": [
        "Regla: DSAB19b, Notificación: NIT del Prestador de Servicios no está autorizado por la DIAN"
      ],
      "created_at": "11-02-2025 10:16:18 PM",
      "qr_image": "data:image/png;base64, iVBORw0KGgoAAAAN...ejemplo...VP/b6nmx4/kdPeb+H1avnIppNeUCAAAAAElFTkSuQmCC",
      "payment_method": {
        "code": "10",
        "name": "Efectivo"
      }
    },
    "items": [
      {
        "code_reference": "12345",
        "name": "producto de prueba",
        "quantity": 1,
        "discount_rate": "20.00",
        "discount": "10000.00",
        "gross_value": "40000.00",
        "tax_rate": "0.00",
        "taxable_amount": "0.00",
        "tax_amount": "0.00",
        "price": "50000.00",
        "is_excluded": 1,
        "unit_measure": {
          "id": 70,
          "code": "94",
          "name": "unidad"
        },
        "standard_code": {
          "id": 1,
          "code": "999",
          "name": "Estándar de adopción del contribuyente"
        },
        "total": 40000,
        "withholding_taxes": [
          {
            "tribute_code": "06",
            "name": "ReteRenta",
            "value": "1400.00",
            "rates": [
              {
                "code": "06",
                "name": "ReteRenta",
                "rate": "3.50"
              }
            ]
          }
        ]
      },
      {
        "code_reference": "54321",
        "name": "producto de prueba 2",
        "quantity": 1,
        "discount_rate": "0.00",
        "discount": "0.00",
        "gross_value": "50000.00",
        "tax_rate": "0.00",
        "taxable_amount": "0.00",
        "tax_amount": "0.00",
        "price": "50000.00",
        "is_excluded": 1,
        "unit_measure": {
          "id": 70,
          "code": "94",
          "name": "unidad"
        },
        "standard_code": {
          "id": 1,
          "code": "999",
          "name": "Estándar de adopción del contribuyente"
        },
        "total": 50000,
        "withholding_taxes": []
      }
    ],
    "withholding_taxes": [
      {
        "tribute_code": "06",
        "name": "ReteRenta",
        "value": "1400.00"
      }
    ],
    "adjustment_notes": [],
    "numbering_range": {
      "prefix": "SEDS",
      "from": 984000000,
      "to": 985000000,
      "resolution_number": "18760000003",
      "start_date": "01-01-2025",
      "end_date": "31-12-2025",
      "months": 11
    }
  }
}

Filtrar Documentos Soporte
Esta sección explica cómo utilizar este endpoint para buscar y filtrar los documentos soporte, la respuesta de cada documento soporte es general si quiere información especifica de un documento soporte debe usar el endpoint: Ver Documento Soporte .

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/support-documents?filter[identification]&filter[names]&filter[number]&filter[prefix]&filter[reference_code]&filter[status]

Nota

Es necesario el envío del token de acceso <access_token> para hacer uso de este endpoint. Para ver cómo generar el token, vea Cómo generar un token de acceso .
Recuerde: El token de acceso caduca cada hora.
La respuesta del endpoint arroja el total de los documentos soporte generados, por pagina 10 resultados, pagina actual, ultima pagina, desde, hasta y los links de navegación entre el endpoint de documentos soporte, los anteriores campos con el fin de paginar la respuesta.

Para navegar entre las páginas, utilice el parámetro de consulta page y especifique el número de página deseado.

Si el número de página no existe, el objeto data estará vacío.

Encabezados de la Solicitud
Para realizar la solicitud es necesario incluir los siguientes encabezados:

Encabezado	Valor	Descripción
Content-Type	application/json	Indica que los datos se envían en formato JSON.
Authorization	Bearer <token_de_acceso>	Token de autenticación necesario para acceder al recurso. Ver Cómo generar token
Accept	application/json	Indica que la respuesta debe estar en formato JSON.
Nota: Reemplaza <token_de_acceso> con el token proporcionado tras autenticarte.

Filtros de Búsqueda
filter[identification]: Filtrar por número de identificación del proveedor.
filter[names]: Filtra por el nombre del proveedor.
filter[number]: Filtra por numero de documento soporte.
filter[prefix]: Filtra por prefijo de rango de numeración.
filter[reference_code]: Filtra por código de referencia.
filter[status]: Filtra por el estado del documento. 1 = validado, 0 si no esta validado.
Respuesta del Endpoint
Status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "data": [
      {
        "id": 6,
        "number": "SEDS984000021",
        "api_client_name": "hallinxsl7@gmail.com",
        "reference_code": "REF0017",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: DSAB19b, Notificación: NIT del Prestador de Servicios no está autorizado por la DIAN"
        ],
        "created_at": "11-02-2025 10:16:18 PM",
        "adjustment_notes": []
      }
    ],
    "pagination": {
      "total": 1,
      "per_page": 10,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 1,
      "links": [
        {
          "url": null,
          "label": "&laquo; Anterior",
          "page": null,
          "active": false
        },
        {
          "url": "https://api-sandbox.factus.com.co/v1/support-documents?filter%5Bnumber%5D=SEDS984000021&page=1",
          "label": 1,
          "page": 1,
          "active": true
        },
        {
          "url": null,
          "label": "Siguiente &raquo;",
          "page": null,
          "active": false
        }
      ]
    }
  }
}

El endpoint devuelve información paginada de los documentos soporte, incluyendo:

Total: Total de los documentos soporte.
Por página: 10 resultados por página.
Página actual: Página en la que se encuentra.
Última página: Última página disponible.
Desde: Índice inicial de los resultados.
Hasta: Índice final de los resultados.
Links: Navegación entre las páginas del endpoint.
Para navegar entre las páginas, utilice el parámetro de consulta page y especifique el número de página deseado.
Si el número de página no existe, el objeto data estará vacío.

Ver Documento soporte
El endpoint devuelve un documento soporte pasando el número del soporte como parámetro en la solicitud GET. Puede encontrar el número del documento soporte, debe ver la respuesta de la creación del documento soporte o en filtrar documento soporte , data.support_document.number .

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/support-documents/show/:number

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
number: Número del documento soporte.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "company": {
      "url_logo": "http://api-sandbox.factus.com.co/storage/images/logos/lC5CLGXHgwlv8slaoiKC6dHkVLIXQVaDkL9C1Yqc.png",
      "nit": "901724254",
      "dv": "1",
      "company": "FACTUS S.A.S.",
      "name": "FACTUS S.A.S.",
      "graphic_representation_name": "FACTUS S.A.S.",
      "registration_code": "bnnmbvncv",
      "economic_activity": "6201",
      "phone": "3133045345",
      "email": "FACTUSFACTURACION@GMAIL.COM",
      "direction": "CARRERA 10 # 9 - 04",
      "municipality": "San Gil"
    },
    "provider": {
      "identification": "123456789",
      "dv": "6",
      "graphic_representation_name": "Alan Turing",
      "trade_name": null,
      "names": "Alan Turing",
      "address": "calle 1 # 2-68",
      "email": "alanturing@enigmasas.com",
      "phone": "1234567890",
      "identification_document": {
        "id": 6,
        "code": "31",
        "name": "NIT"
      },
      "legal_organization": {
        "id": 2,
        "code": "2",
        "name": "Persona Natural"
      },
      "tribute": {
        "id": 21,
        "code": "ZZ",
        "name": "No aplica"
      },
      "country": {
        "id": 46,
        "code": "CO",
        "name": "Colombia"
      },
      "municipality": {
        "id": 980,
        "code": "68679",
        "name": "San Gil"
      }
    },
    "support_document": {
      "id": 6,
      "number": "SEDS984000021",
      "reference_code": "REF0017",
      "status": 1,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=69f218c3601e279d9d47d091fe1c2d85e2b727a9576811d7a561d16313860799f26e8b0c8ae9f68db7a61a7234329f06",
      "cuds": "69f218c3601e279d9d47d091fe1c2d85e2b727a9576811d7a561d16313860799f26e8b0c8ae9f68db7a61a7234329f06",
      "validated": "11-02-2025 10:16:23 PM",
      "discount_rate": "0.00",
      "discount": "0.00",
      "gross_value": "90000.00",
      "taxable_amount": "0.00",
      "tax_amount": "0.00",
      "total": "90000.00",
      "observation": null,
      "errors": [
        "Regla: DSAB19b, Notificación: NIT del Prestador de Servicios no está autorizado por la DIAN"
      ],
      "created_at": "11-02-2025 10:16:18 PM",
      "qr_image": "data:image/png;base64, iVBORw0KGgoAA...ejemplo...Peb+H1avnIppNeUCAAAAAElFTkSuQmCC",
      "payment_method": {
        "code": "10",
        "name": "Efectivo"
      }
    },
    "items": [
      {
        "code_reference": "12345",
        "name": "producto de prueba",
        "quantity": 1,
        "discount_rate": "20.00",
        "discount": "10000.00",
        "gross_value": "40000.00",
        "tax_rate": "0.00",
        "taxable_amount": "0.00",
        "tax_amount": "0.00",
        "price": "50000.00",
        "is_excluded": 1,
        "unit_measure": {
          "id": 70,
          "code": "94",
          "name": "unidad"
        },
        "standard_code": {
          "id": 1,
          "code": "999",
          "name": "Estándar de adopción del contribuyente"
        },
        "total": 40000,
        "withholding_taxes": [
          {
            "tribute_code": "06",
            "name": "ReteRenta",
            "value": "1400.00",
            "rates": [
              {
                "code": "06",
                "name": "ReteRenta",
                "rate": "3.50"
              }
            ]
          }
        ]
      },
      {
        "code_reference": "54321",
        "name": "producto de prueba 2",
        "quantity": 1,
        "discount_rate": "0.00",
        "discount": "0.00",
        "gross_value": "50000.00",
        "tax_rate": "0.00",
        "taxable_amount": "0.00",
        "tax_amount": "0.00",
        "price": "50000.00",
        "is_excluded": 1,
        "unit_measure": {
          "id": 70,
          "code": "94",
          "name": "unidad"
        },
        "standard_code": {
          "id": 1,
          "code": "999",
          "name": "Estándar de adopción del contribuyente"
        },
        "total": 50000,
        "withholding_taxes": []
      }
    ],
    "withholding_taxes": [
      {
        "tribute_code": "06",
        "name": "ReteRenta",
        "value": "1400.00"
      }
    ],
    "adjustment_notes": [],
    "numbering_range": {
      "prefix": "SEDS",
      "from": 984000000,
      "to": 985000000,
      "resolution_number": "18760000003",
      "start_date": "01-01-2025",
      "end_date": "31-12-2025",
      "months": 11
    }
  }
}

Descargar PDF
El endpoint devuelve un pdf del documento soporte en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/support-documents/download-pdf/:number

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
number: Número de documento soporte.
Puede encontrar el número del documento soporte, debe ver la respuesta de la creación del documento soporte o en filtrar documento soporte , data.data.number .

Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "ds09017242540002500000006",
    "pdf_base_64_encoded": "JVBERi0xLjQKJeLjz9MKMyAwIG9iag...ejemplo...E3OD5dCj4+CnN0YXJ0eHJlZgo0NDk2NgolJUVPRg=="
  }
}

Descargar XML
El endpoint devuelve el xml del documento en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/support-documents/download-xml/:number

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
number: Número de documento soporte.
Puede encontrar el número del documento soporte, debe ver la respuesta de la creación del documento soporte o en filtrar documento soporte , data.data.number .

status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "ds09017242540002500000006",
    "xml_base_64_encoded": "PD94bWwgdmVyc2lvbj0i...ejemplo...bmU+CjwvSW52b2ljZT4="
  }
}

Eliminar Documento soporte No Validado
Elimina un documento soporte usando el código de referencia con el cual se creó. Los documentos soporte se pueden eliminar siempre y cuando no se encuentren validados por la DIAN. Se suele eliminar un documento soporte cuando contiene errores de validación notificados por la DIAN para crearla nuevamente corregida.

Nota: Esta petición es síncrona, eso quiere decir que en la misma solicitud recibe el mensaje de si se ha eliminado el documento soporte.

Método: DELETE

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/support-documents/reference/:reference_code

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
reference_code: Código de referencia del documento soporte.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Documento con código de referencia <reference_code> eliminado con éxito"
}