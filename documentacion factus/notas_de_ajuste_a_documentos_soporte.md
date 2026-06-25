Introducción
¿Qué es una Nota de Ajuste al Documento Soporte?
Es un documento electrónico que permite corregir o modificar la información de un Documento Soporte en Adquisiciones a No Obligados a Facturar Electrónicamente. Se utiliza para realizar ajustes relacionados con valores, conceptos, errores en la información o cualquier modificación necesaria sobre el documento original.

¿Quién lo debe emitir?
El comprador del bien o servicio que previamente generó el Documento Soporte.

¿Cuándo se usa?
Se genera cuando es necesario corregir errores en un Documento Soporte previamente emitido o ajustar información relevante para efectos tributarios, costos, deducciones o impuestos descontables.

Crear y validar
Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/adjustment-notes/validate

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

Endpoints para datos de nota de ajuste a documentos soporte
Factus ofrece una serie de endpoints de apoyo diseñados para simplificar el proceso de creación de la nota de ajuste a documentos soporte. Estos datos son de uso recurrente y, dado que rara vez se actualizan, se recomienda almacenarlos de manera persistente en su sistema. Esto no solo evita consultas repetitivas, sino que también mejora significativamente los tiempos de respuesta. Sin embargo, si opta por consultarlos dinámicamente, es importante evaluar el impacto en el rendimiento del sistema.

Rangos de numeración
Tributos
Unidades de medida
Nota: Para el rango de numeración es necesario seleccionar el id del rango correspondiente a notas de ajuste a documentos soporte y que el campo is_active sea 1 (activo)
Estructura para crear la nota de ajuste a documento soporte
Para crear una nota de ajuste a documento soporte en Factus API debemos tener en cuenta los siguientes datos:

Datos generales del documento soporte.
Datos del documento que al cual se le hará la nota de ajuste.
Datos de los productos o servicios.
Parámetros del Cuerpo (Body)
El cuerpo (Body) de la solicitud debe enviarse en formato JSON y debe incluir los siguientes parámetros:

Descripción del body
ID	Descripción
reference_code	Código único que sirve para identificar cada documento soporte de manera unívoca en el sistema y garantizar que no haya duplicados. Esto nos ayuda a prevenir que se genere más de un documento soporte con la misma información.
numbering_range_id	ID del rango de numeración. Para conocer el ID de cada rango de numeración, consulta el siguiente endpoint: rangos de numeración . Si en la API solo hay un rango de numeración activo para los documentos soporte, este campo es opcional. En caso de no enviarlo, la API utilizará automáticamente el único rango activo. Si existen múltiples rangos de numeración para los documentos soporte, este campo es obligatorio.
payment_method_code	(Opcional) Código del método de pago. Si el medio de pago no se agrega, por defecto la API agrega el código 10 (efectivo). Para saber cuál es el código de cada método de pago, consulte la siguiente tabla: Métodos de pago .
support_document_id	ID del documento soporte al que se le hará la nota de ajuste.
correction_concept_code	Código del motivo por el cual se genera la nota de ajuste. Para conocer el código de cada motivo, consulte el siguiente endpoint: Motivos para la generación de las notas de ajuste .
observation	Agrega una observación. No debe tener más de 250 caracteres.
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

201 - Nota de ajuste a documento Soporte
{
  "reference_code": "REF007",
  "numbering_range_id": 9,
  "payment_method_code": "10",
  "support_document_id": 224,
  "correction_concept_code": "2",
  "observation": "",
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
          "withholding_tax_rate": "15.00"
        }
      ]
    }
  ]
}

Ejemplo de respuesta
201 - Nota de ajuste a documento Soporte
Status 409
Status 422
{
  "status": "Created",
  "message": "Documento con el código de referencia REF001 registrado y validado con éxito",
  "data": {
    "company": {
      "url_logo": "http://api.test/storage/images/logos/2wkU627FUczVkr8U5P8yrYowQ44eYQG0Y9ymXhtP.png",
      "nit": "900825759",
      "dv": "7",
      "company": "HALLTEC S.A.S.",
      "name": "HALLTEC S.A.S.",
      "graphic_representation_name": "HALLTEC S.A.S.",
      "registration_code": "3FJ3253427",
      "economic_activity": "6311",
      "phone": "3165584659",
      "email": "yocahe5@gmail.com",
      "direction": "cra 10 # 9 - 04",
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
      "municipality": {
        "id": 980,
        "code": "68679",
        "name": "San Gil"
      }
    },
    "adjustment_note": {
      "id": 69,
      "number": "NDA35",
      "reference_code": "REF001",
      "status": 1,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=cfcbaeb5524b4eafcce235a0ec0566bf6e4f8d4b9dc659954b6b10f4f6b2bd48348ca9ccd3bc613faa5513083169b2eb",
      "cuds": "cfcbaeb5524b4eafcce235a0ec0566bf6e4f8d4b9dc659954b6b10f4f6b2bd48348ca9ccd3bc613faa5513083169b2eb",
      "validated": "07-02-2025 05:06:27 PM",
      "discount_rate": "0.00",
      "discount": "0.00",
      "gross_value": "40000.00",
      "taxable_amount": "0.00",
      "tax_amount": "0.00",
      "total": "40000.00",
      "observation": null,
      "errors": [
        "Regla: NSAX04, Notificación: No se encuentra el grupo TaxSubtotal",
        "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
        "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suminstrado."
      ],
      "created_at": "07-02-2025 05:06:24 PM",
      "qr_image": "data:image/png;base64, iVBORw0KGgoAAAANSUhE...ejemplo..G/MKriAntbjYTz4gDjxg3ITRzS01mj30DjZ0Lxb+l37v8CEMoenn8ttCMAAAAASUVORK5CYII=",
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
            "value": "6000.00",
            "rates": [
              {
                "code": "06",
                "name": "ReteRenta",
                "rate": "15.00"
              }
            ]
          }
        ]
      }
    ],
    "withholding_taxes": [
      {
        "tribute_code": "06",
        "name": "ReteRenta",
        "value": "6000.00"
      }
    ]
  }
}

Filtrar notas de ajuste
Esta sección explica cómo utilizar este endpoint para buscar y filtrar las notas de ajuste a documentos soporte, la respuesta de cada nota de ajuste es general si quiere información especifica de una nota de ajuste a documento soporte debe usar el endpoint: Ver nota de ajuste a documento soporte .

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/adjustment-notes?filter[identification]&filter[names]&filter[number]&filter[prefix]&filter[reference_code]&filter[status]

Nota

Es necesario el envío del token de acceso <access_token> para hacer uso de este endpoint. Para ver cómo generar el token, vea Cómo generar un token de acceso .
Recuerde: El token de acceso caduca cada hora.
La respuesta del endpoint arroja el total de las notas de ajuste a documentos soporte generados, por pagina 10 resultados, pagina actual, ultima pagina, desde, hasta y los links de navegación entre el endpoint de notas de ajuste a documentos soporte, los anteriores campos con el fin de paginar la respuesta.

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
filter[identification]: Filtrar por número de identificación.
filter[names]: Filtra por el nombre del proveedor.
filter[number]: Filtra por numero de nota de ajuste.
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
        "id": 75,
        "number": "NDA40",
        "api_client_name": "Halltec",
        "reference_code": "REF006",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "40000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "10-02-2025 10:22:38 AM"
      },
      {
        "id": 74,
        "number": "NDA39",
        "api_client_name": "Halltec",
        "reference_code": "REF005",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "40000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "10-02-2025 10:21:25 AM"
      },
      {
        "id": 73,
        "number": "NDA38",
        "api_client_name": "Halltec",
        "reference_code": "REF004",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "40000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "10-02-2025 10:20:17 AM"
      },
      {
        "id": 72,
        "number": "NDA37",
        "api_client_name": "Halltec",
        "reference_code": "REF003",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "40000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "10-02-2025 10:14:05 AM"
      },
      {
        "id": 71,
        "number": "NDA36",
        "api_client_name": "Halltec",
        "reference_code": "REF002",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "40000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "10-02-2025 10:13:32 AM"
      },
      {
        "id": 69,
        "number": "NDA35",
        "api_client_name": "Halltec",
        "reference_code": "REF001",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "40000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "07-02-2025 05:06:24 PM"
      },
      {
        "id": 68,
        "number": "NDA34",
        "api_client_name": "Halltec",
        "reference_code": "001",
        "identification": "1100970785",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "06-02-2025 09:45:54 PM"
      },
      {
        "id": 67,
        "number": "NDA33",
        "api_client_name": "Halltec",
        "reference_code": "002",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "06-02-2025 05:01:09 PM"
      },
      {
        "id": 66,
        "number": "NDA32",
        "api_client_name": "Halltec",
        "reference_code": "003",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "trade_name": null,
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
          "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "created_at": "06-02-2025 04:29:32 PM"
      },
      {
        "id": 65,
        "number": "NDA31",
        "api_client_name": "Halltec",
        "reference_code": "004",
        "identification": "17879221513",
        "graphic_representation_name": "Stephanie M Rodriguez",
        "trade_name": null,
        "names": "Stephanie M Rodriguez",
        "email": "fefa940@gmail.com",
        "total": "80000.00",
        "status": 1,
        "errors": [],
        "created_at": "06-02-2025 03:08:06 PM"
      }
    ],
    "pagination": {
      "total": 39,
      "per_page": 10,
      "current_page": 1,
      "last_page": 4,
      "from": 1,
      "to": 10,
      "links": [
        {
          "url": null,
          "label": "&laquo; Anterior",
          "page": null,
          "active": false
        },
        {
          "url": "http://api.test/v1/adjustment-notes?page=1",
          "label": 1,
          "page": 1,
          "active": true
        },
        {
          "url": "http://api.test/v1/adjustment-notes?page=2",
          "label": 2,
          "page": 2,
          "active": false
        },
        {
          "url": "http://api.test/v1/adjustment-notes?page=3",
          "label": 3,
          "page": 3,
          "active": false
        },
        {
          "url": "http://api.test/v1/adjustment-notes?page=4",
          "label": 4,
          "page": 4,
          "active": false
        },
        {
          "url": "http://api.test/v1/adjustment-notes?page=2",
          "label": "Siguiente &raquo;",
          "page": 2,
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

Ver nota de ajuste
El endpoint devuelve una nota de ajuste a documento soporte pasando el número del soporte como parámetro en la solicitud GET. Puede encontrar el número del documento soporte, debe ver la respuesta de la creación del documento soporte o en filtrar documento soporte , data.support_document.number .

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/adjustment-notes/:number

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
number: Número de la nota de ajuste.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "company": {
      "url_logo": "http://api.test/storage/images/logos/2wkU627FUczVkr8U5P8yrYowQ44eYQG0Y9ymXhtP.png",
      "nit": "900825759",
      "dv": "7",
      "company": "HALLTEC S.A.S.",
      "name": "HALLTEC S.A.S.",
      "graphic_representation_name": "HALLTEC S.A.S.",
      "registration_code": "3FJ3253427",
      "economic_activity": "6311",
      "phone": "3165584659",
      "email": "yocahe5@gmail.com",
      "direction": "cra 10 # 9 - 04",
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
      "municipality": {
        "id": 980,
        "code": "68679",
        "name": "San Gil"
      }
    },
    "adjustment_note": {
      "id": 75,
      "number": "NDA40",
      "reference_code": "REF006",
      "status": 1,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=c5c70b7c91e371cbc157fc6ba8dd490ba480573126dbcbd2b57b29ee1fc9fafb0ecd405a3928d9bc1ca7cc3c2189da40",
      "cuds": "c5c70b7c91e371cbc157fc6ba8dd490ba480573126dbcbd2b57b29ee1fc9fafb0ecd405a3928d9bc1ca7cc3c2189da40",
      "validated": "10-02-2025 10:22:41 AM",
      "discount_rate": "0.00",
      "discount": "0.00",
      "gross_value": "40000.00",
      "taxable_amount": "0.00",
      "tax_amount": "0.00",
      "total": "40000.00",
      "observation": null,
      "errors": [
        "Regla: NSAJ44b, Notificación: Nit o Documento de Identificación informado No corresponde al registrado en el RUT con respecto a la razón social o nombre comercial suministrado.",
        "Regla: NSAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suminstrado."
      ],
      "created_at": "10-02-2025 10:22:38 AM",
      "qr_image": "data:image/png;base64, iVBORw0KGgoAAAA...ejemplo...fwGjbWxMEknTMAAAAABJRU5ErkJggg==",
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
            "value": "6000.00",
            "rates": [
              {
                "code": "06",
                "name": "ReteRenta",
                "rate": "15.00"
              }
            ]
          }
        ]
      }
    ],
    "withholding_taxes": [
      {
        "tribute_code": "06",
        "name": "ReteRenta",
        "value": "6000.00"
      }
    ]
  }
}

Descargar PDF
El endpoint devuelve un pdf de la nota de ajuste a documento soporte en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/adjustment-notes/download-pdf/:number

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
number: Número de la nota de ajuste a documento soporte.
Puede encontrar el número de la nota de ajuste a documento soporte, debe ver la respuesta de la creación de nota de ajuste o en filtrar notas de ajuste , data.data.number .

Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "nas09008257590002500000017",
    "pdf_base_64_encoded": "JVBERi0xLjQKJeLjz9MKMyAw...ejemplo...2Pl0KPj4Kc3RhcnR4cmVmCjQ0NjE0CiUlRU9G"
  }
}

Descargar XML
El endpoint devuelve el xml de la nota de ajuste a documento soporte en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/adjustment-notes/download-xml/:number

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
Puede encontrar el número de la nota de ajuste a documento soporte, debe ver la respuesta de la creación de nota de ajuste o en filtrar notas de ajuste , data.data.number .

status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "nas09008257590002500000017",
    "xml_base_64_encoded": "PD94bWwgdmVyc2lvbj0iMS...ejemplo...ROb3RlTGluZT4KPC9DcmVkaXROb3RlPg=="
  }
}

Eliminar nota de ajuste
Elimina una nota de ajuste a documento soporte usando el código de referencia con el cual se creó. Las notas de ajuste se pueden eliminar siempre y cuando no se encuentren validados por la DIAN. Se suele eliminar una nota de ajuste cuando contiene errores de validación notificados por la DIAN para crearla nuevamente corregida.

Nota: Esta petición es síncrona, eso quiere decir que en la misma solicitud recibe el mensaje de si se ha eliminado la nota de ajuste documento soporte.

Método: DELETE

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/adjustment-notes/reference/:reference_code

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
reference_code: Código de referencia de la nota de ajuste a documento soporte.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Documento con código de referencia REF007 eliminado con éxito"
}