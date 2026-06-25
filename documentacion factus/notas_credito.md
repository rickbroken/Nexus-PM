Crear y Validar Nota Crédito
Este endpoint permite crear una nota crédito y validarla.

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/validate

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

Descripción de campos
Campo	Descripción
numbering_range_id	ID del rango de numeración. Para saber cual es el ID de cada rango de numeración consulte el siguiente endpoint: Rangos de numeración Si tienes en la API solo un rango de numeración activo para la notas crédito, este campo puede ser opcional. Si no envías el rango de numeración la API tomara el único rango de numeración que este activo. Si hay más de un rango de numeración para las notas crédito, este campo es obligatorio.
correction_concept_code	Código de corrección. Código del concepto por el cual se genera la nota crédito. Para saber los códigos aceptados revisa la tabla codigos de correción .
customization_id	Código del tipo de operación. Para saber los códigos aceptados revisar la tabla Códigos de tipos de operación .
bill_id	ID de la factura a la que se le generará la nota crédito. Este campo es opcional si el campo customization_id = 22 (Nota crédito sin referencia a una factura electrónica).
reference_code	Código único que sirve para identificar cada nota crédito de manera unívoca en el sistema y garantizar que no haya duplicados. Esto nos ayuda a prevenir que se genere más de una nota crédito con la misma información.
payment_method_code	Código del método de pago. Para ver los método de pago disponibles revisa la tabla método de pago
send_email	(Opcional) Booleano que indica si el sistema debe enviar el correo electrónico al cliente. Útil cuando el envío del correo se gestiona de forma externa o personalizada por el integrador. Por defecto, este campo tiene un valor de true, lo que implica que el correo electrónico será enviado al cliente. Si se establece en false, el correo no será enviado.
observation	(Opcional) Agrega una observación en caso de requerirlo (máximo 250 caracteres).
billing_period (Object)*	(Opcional) Este es un objeto que contendrá la información del periodo de facturación. Para utilizar en los servicios públicos, contratos de arrendamiento, matriculas en educación, etc. Ver el ejemplo en el body. Este campo es requerido si el campo customization_id = 22 (Nota crédito sin referencia a una factura electrónica).
billing_period.start_date	Fecha de inicio del periodo de facturación en formato YYYY-MM-DD.
billing_period.start_time	(Opcional) Hora de inicio del periodo de facturación en formato HH:mm:ss.
billing_period.end_date	Fecha de fin del periodo de facturación en formato YYYY-MM-DD.
billing_period.end_time	(Opcional) Hora de fin del periodo de facturación en formato HH:mm:ss.
establishment (object)	(Opcional) Objeto que contendrá la información sobre el establecimiento. Úsalo cuando manejes más de un establecimiento y necesites que los datos correspondientes se reflejen en la nota crédito.
establishment.name (string)	Nombre del establecimiento.
establishment.address (string)	Dirección del establecimiento.
establishment.phone_number (string)	Número telefónico del establecimiento.
establishment.email (string)	Correo electrónico del establecimiento.
establishment.municipality_id (integer)	ID que corresponda al Municipio donde se encuentra el establecimiento. Para saber cual ID corresponde al municipio consulte el endpoint de Municipios
customer (object)	(Opcional) Este es un objeto que contendrá la información del cliente de la nota crédito. Si no se envían los datos del cliente, la API tomara los datos del cliente de la factura relacionada al campo bill_id.
customer.identification_document_id (integer)	ID que corresponda al tipo de identificación. Para saber cual ID corresponde al tipo de identificación consulte la siguiente tabla IDs tipos de documentos.
customer.identification (string)	Número de identificación del cliente.
customer.dv (integer)	(Opcional) Dígito de verificación del cliente. Requerido si el cliente se identifica con NIT.
customer.company (string)	(Opcional) Razón social. Obligatorio si el cliente es persona jurídica.
customer.trade_name (string)	(Opcional) Nombre comercial
customer.names (string)	(Opcional) Nombre del cliente. Solo aplica para los clientes que son personas naturales.
customer.address (string)	(Opcional) Dirección del cliente.
customer.email (string)	(Opcional) Correo electrónico del cliente.
customer.phone (string)	(Opcional) Número de teléfono del cliente.
customer.legal_organization_id (integer)	ID que corresponda al tipo de organización. Para saber cual ID corresponde al tipo de organización consulte la tabla IDs tipos de organizaciones.
customer.tribute_id (integer)	ID del tributo. Para saber cual ID corresponde al tributo consulte la tabla IDs tipos de tributos.
customer.municipality_id (integer)	(Opcional) ID que corresponda al municipio donde vive el cliente. Para saber cual ID corresponde al municipio consulte el endpoint de Municipios .
Nota: Se debe enviar ID del municipio únicamente si el municipio es de Colombia, si es extranjero el campo es opcional.
items	El array de objetos (items), corresponde a los productos de la nota crédito, se debe enviar un objeto por cada producto o servicio.
items.note (string)	(opcional) Añade información adicional del producto o servicio.
items.code_reference (string)	Código de referencia del producto o servicio.
items.name (string)	Nombre del producto o servicio.
items.quantity (integer)	Cantidad del producto o servicio. Debe ser un número entero.
items.discount_rate (float)	Porcentaje del descuento del producto o servicio (máximo dos decimales).
items.price (float)	Precio del producto o servicio con impuestos incluidos (máximo dos decimales).
items.tax_rate (string)	Porcentaje del impuesto aplicado al producto o servicio.
items.unit_measure_id (integer)	ID que corresponda a la unidad de medida del item. Para saber que ID corresponde a cada unidad de medida consulte el endpoint Unidades de medida.
items.standard_code_id (integer)	ID que corresponde al código de estándar que se adopto para los productos o servicios. Para saber que ID corresponde al código de estándar consulte la tabla IDs de códigos de estándar.
items.is_excluded (integer)	Si el producto está excluido de IVA (0: no, 1: sí).
items.tribute_id (integer)	Tipo de tributo aplicado. Se consume del endpoint de tributos de productos. .
items.withholding_taxes (array)	(Opcional) Array de objetos (autorretenciones) Este campo sirve para informar las retenciones en la fuente que se aplican al producto o servicio.
No son retenciones que otra persona o empresa te hace a ti, sino retenciones que tú mismo te aplicas como contribuyente.
Por cada retención que te apliques a ti mismo, debes enviar un objeto.
items.withholding_taxes.code (integer)	Código relacionado con la retención aplicada al producto o servicio. Para saber los códigos de las retenciones consulte la tabla tributos.
items.withholding_taxes.withholding_tax_rate (float)	Porcentaje de la retención aplicada al producto o servicio.
allowance_charges (array)	(Opcional) Array de objetos que corresponden a los descuentos o recargos que se aplican a la nota crédito, se debe enviar un objeto por cada descuento o recargo.
allowance_charges.concept_type (string)	Código del tipo de descuento o recargo. Para saber el código que pertenece a un descuento o recargo consulte la tabla Códigos de los conceptos
allowance_charges.is_surcharge (boolean)	Indica si es un descuento o un recargo. El valor true corresponde a un recargo y false a un descuento.
allowance_charges.reason (string)	Razón por la cual se esta haciendo el descuento o recargo.
allowance_charges.base_amount (float)	Base sobre la cual se calcula el descuento o recargo (Máximo dos decimales).
allowance_charges.amount (float)	Valor monetario del descuento o recargo aplicado, (Máximo dos decimales).
Ejemplo de Solicitud
Aquí tienes un ejemplo de cómo debería quedar el cuerpo de la solicitud en formato JSON:

status 201
status 409
status 422
{
  "numbering_range_id": 5,
  "correction_concept_code": 2,
  "customization_id": 20,
  "bill_id": 514,
  "reference_code": "5",
  "observation": "",
  "payment_method_code": "10",
  "establishment": {
    "name": "SuperMarket",
    "address": "calle 10 # 3-13",
    "phone_number": "0987654321",
    "email": "supermarket@gmail.com",
    "municipality_id": 980
  },
  "customer": {
    "identification": "123456789",
    "dv": "3",
    "company": "",
    "trade_name": "",
    "names": "Alan Turing",
    "address": "calle 1 # 2-68",
    "email": "alanturing@enigmasas.com",
    "phone": "1234567890",
    "legal_organization_id": "2",
    "tribute_id": "21",
    "identification_document_id": 3,
    "municipality_id": "980"
  },
  "items": [
    {
      "code_reference": "123456",
      "name": "Aspirina",
      "quantity": 1,
      "discount_rate": 0,
      "price": 80000,
      "tax_rate": "19.00",
      "unit_measure_id": 70,
      "standard_code_id": 1,
      "is_excluded": 0,
      "tribute_id": 1,
      "withholding_taxes": []
    }
  ]
}

Ejemplo de respuesta
status 201
status 409
status 422
{
  "status": "Created",
  "message": "Documento con el código de referencia 5 registrado y validado con éxito",
  "data": {
    "company": {
      "url_logo": "http://api.test/storage/images/logos/uKWIKmmwxeELNzmrxyKoGgbCtimDV1zInzQqgNin.png",
      "nit": "900825759",
      "dv": "7",
      "company": "HALLTEC S.A.S.",
      "name": "HALLTEC",
      "registration_code": "3FJ3253427",
      "economic_activity": "6311",
      "phone": "3165584659",
      "email": "yocahe5@gmail.com",
      "direction": "cra 10 # 9 - 04",
      "municipality": "San Gil"
    },
    "establishment": {
      "name": "SuperMarket",
      "address": "calle 10 # 3-13",
      "phone_number": "0987654321",
      "email": "supermarket@gmail.com",
      "municipality_id": {
        "id": 996,
        "code": "68872",
        "name": "Villanueva",
        "department": {
          "id": 28,
          "code": "68",
          "name": "Santander"
        }
      }
    },
    "customer": {
      "identification": "123456789",
      "dv": null,
      "graphic_representation_name": "Alan Turing",
      "trade_name": "",
      "company": "",
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
    "credit_note": {
      "id": 132,
      "number": "NC76",
      "reference_code": "5",
      "status": 1,
      "send_email": 0,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=eee1fc09684c19aaa7cee1b97d3923e286b1ccf12bdd0d185b4ddcbbab87bcbe9d589a9daf9eee9f55132c782c1b8bc0",
      "cude": "eee1fc09684c19aaa7cee1b97d3923e286b1ccf12bdd0d185b4ddcbbab87bcbe9d589a9daf9eee9f55132c782c1b8bc0",
      "validated": "20-09-2024 09:13:43 AM",
      "gross_value": "67226.89",
      "taxable_amount": "67226.89",
      "tax_amount": "12773.11",
      "discount_amount": "0.00",
      "surcharge_amount": "0.00",
      "total": "80000.00",
      "observation": null,
      "errors": [
        "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
        "Regla: CAK55, Notificación: Correo electrónico no informado"
      ],
      "created_at": "20-09-2024 09:13:42 AM",
      "qr_image": "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgTwAAA...ejemplo..SRqZ6jWbmIABJRU5ErkJggg==",
      "bill_id": 514,
      "cufe": "025972ce686eb5fc89a78ab8e9de34c3dea87d23982694ff25843b7f3046b0ac42815f9bb7a1f7469062ef0c11f2eac0",
      "number_bill": "SETP990000302",
      "payment_method": {
        "name": "Efectivo",
        "code": "10"
      },
      "customization_id": {
        "code": "20",
        "name": "Nota Crédito que referencia una factura electrónica."
      },
      "correction_concept": {
        "code": "2",
        "name": "Anulación de factura electrónica"
      }
    },
    "items": [
      {
        "note": null,
        "code_reference": "123456",
        "name": "Aspirina",
        "quantity": 1,
        "discount_rate": "0.00",
        "discount": "0.00",
        "gross_value": "67226.89",
        "tax_rate": "19.00",
        "taxable_amount": "67226.89",
        "tax_amount": "12773.11",
        "price": "80000.00",
        "is_excluded": 0,
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
        "tribute": {
          "id": 1,
          "code": "01",
          "name": "IVA"
        },
        "total": 80000,
        "withholding_taxes": []
      }
    ],
    "withholding_taxes": []
  }
}

Ver y Filtrar Notas Crédito
Esta sección explica cómo utilizar este endpoint para buscar y filtrar los registros de notas crédito.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes?filter[identification]&filter[names]&filter[number]&filter[prefix]&filter[reference_code]&filter[status]

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

Filtros de Búsqueda
filter[identification]: Filtra por el número de identificación del cliente.
filter[names]: Filtra por el nombre del cliente.
filter[number]: Filtra por el número de nota crédito.
filter[prefix]: Filtra por el prefijo de nota crédito.
filter[reference_code]: Filtra por código de referencia.
filter[status]: Filtra por el estado del la nota crédito (1=validada, 0= pendiente por validar).
Respuesta del Endpoint
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "data": [
      {
        "id": 140,
        "api_client_name": "Factus",
        "reference_code": "REF010",
        "number": "NC81",
        "identification": "12345678",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": null,
        "total": "50000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
          "Regla: CAK55, Notificación: Correo electrónico no informado"
        ],
        "send_email": 0,
        "created_at": "30-09-2024 10:13:00 AM"
      },
      {
        "id": 139,
        "api_client_name": "Factus",
        "reference_code": "REF009",
        "number": "NC80",
        "identification": "12345678",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": null,
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
          "Regla: CAK55, Notificación: Correo electrónico no informado"
        ],
        "send_email": 0,
        "created_at": "30-09-2024 10:11:40 AM"
      },
      {
        "id": 138,
        "api_client_name": "Factus",
        "reference_code": "REF008",
        "number": "NC79",
        "identification": "12345678",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": null,
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
          "Regla: CAK55, Notificación: Correo electrónico no informado"
        ],
        "send_email": 0,
        "created_at": "27-09-2024 03:32:47 PM"
      },
      {
        "id": 137,
        "api_client_name": "Factus",
        "reference_code": "REF007",
        "number": "NC78",
        "identification": "12345678",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": null,
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
          "Regla: CAK55, Notificación: Correo electrónico no informado"
        ],
        "send_email": 0,
        "created_at": "23-09-2024 08:50:26 AM"
      },
      {
        "id": 135,
        "api_client_name": "Factus",
        "reference_code": "REF006",
        "number": "NC77",
        "identification": "12345678",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": null,
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
          "Regla: CAK55, Notificación: Correo electrónico no informado"
        ],
        "send_email": 0,
        "created_at": "20-09-2024 04:56:24 PM"
      },
      {
        "id": 132,
        "api_client_name": "Factus",
        "reference_code": "REF005",
        "number": "NC76",
        "identification": "222222222222",
        "graphic_representation_name": "Consumidor final",
        "company": "",
        "trade_name": null,
        "names": "Consumidor final",
        "email": "",
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada",
          "Regla: CAK55, Notificación: Correo electrónico no informado"
        ],
        "send_email": 0,
        "created_at": "20-09-2024 09:13:42 AM"
      },
      {
        "id": 131,
        "api_client_name": "Factus",
        "reference_code": "REF004",
        "number": "NC75",
        "identification": "222222222222",
        "graphic_representation_name": "Consumidor final",
        "company": "",
        "trade_name": null,
        "names": "Consumidor final",
        "email": null,
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada"
        ],
        "send_email": 1,
        "created_at": "20-09-2024 08:56:01 AM"
      },
      {
        "id": 125,
        "api_client_name": "Factus",
        "reference_code": "REF003",
        "number": "NC74",
        "identification": "222222222222",
        "graphic_representation_name": "Consumidor final",
        "company": "",
        "trade_name": null,
        "names": "Consumidor final",
        "email": null,
        "total": "80000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada"
        ],
        "send_email": 1,
        "created_at": "19-09-2024 09:02:11 AM"
      },
      {
        "id": 123,
        "api_client_name": "Factus",
        "reference_code": "REF002",
        "number": "NC73",
        "identification": "222222222222",
        "graphic_representation_name": "Consumidor final",
        "company": "",
        "trade_name": null,
        "names": "Consumidor final",
        "email": null,
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada"
        ],
        "send_email": 1,
        "created_at": "18-09-2024 05:07:55 PM"
      },
      {
        "id": 122,
        "api_client_name": "Factus",
        "reference_code": "REF001",
        "number": "NC72",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "company": "",
        "trade_name": "",
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada"
        ],
        "send_email": 1,
        "created_at": "18-09-2024 04:14:45 PM"
      }
    ],
    "pagination": {
      "total": 81,
      "per_page": 10,
      "current_page": 1,
      "last_page": 9,
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
          "url": "http://api.test/v1/credit-notes?page=1",
          "label": 1,
          "page": 1,
          "active": true
        },
        {
          "url": "http://api.test/v1/credit-notes?page=2",
          "label": 2,
          "page": 2,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=3",
          "label": 3,
          "page": 3,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=4",
          "label": 4,
          "page": 4,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=5",
          "label": 5,
          "page": 5,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=6",
          "label": 6,
          "page": 6,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=7",
          "label": 7,
          "page": 7,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=8",
          "label": 8,
          "page": 8,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=9",
          "label": 9,
          "page": 9,
          "active": false
        },
        {
          "url": "http://api.test/v1/credit-notes?page=2",
          "label": "Siguiente &raquo;",
          "page": 2,
          "active": false
        }
      ]
    }
  }
}

El endpoint devuelve información paginada de las notas crédito, incluyendo:

total: Total de las notas crédito.
por página: 10 resultados por página.
página actual: Página en la que se encuentra.
última página: Última página disponible.
desde: Índice inicial de los resultados.
hasta: Índice final de los resultados.
links: Navegación entre las páginas del endpoint.
Para navegar entre las páginas, utilice el parámetro de consulta page y especifique el número de página deseado.

Ver Nota Crédito
El endpoint devuelve una nota crédito específica pasando el número de la nota crédito como parámetro en la solicitud GET. Puede encontrar el número de la nota crédito en la respuesta de la creación de la nota crédito o en ver y filtrar notas crédito , data.credit_note.number.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/:number

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
number: Número de nota crédito.
Ejemplo de respuesta
status 200
status 404
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "company": {
      "url_logo": "http://api.test/storage/images/logos/uKWIKmmwxeELNzmrxyKoGgbCtimDV1zInzQqgNin.png",
      "nit": "900825759",
      "dv": "7",
      "company": "HALLTEC S.A.S.",
      "name": "HALLTEC",
      "registration_code": "3FJ3253427",
      "economic_activity": "6311",
      "phone": "3165584659",
      "email": "yocahe5@gmail.com",
      "direction": "cra 10 # 9 - 04",
      "municipality": "San Gil"
    },
    "establishment": {
      "name": "SuperMarket",
      "address": "calle 10 # 3-13",
      "phone_number": "0987654321",
      "email": "supermarket@gmail.com",
      "municipality_id": {
        "id": 996,
        "code": "68872",
        "name": "Villanueva",
        "department": {
          "id": 28,
          "code": "68",
          "name": "Santander"
        }
      }
    },
    "billing_period": [],
    "customer": {
      "identification": "123456789",
      "dv": null,
      "graphic_representation_name": "Alan Turing",
      "trade_name": "",
      "company": "",
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
    "credit_note": {
      "id": 122,
      "number": "NC72",
      "reference_code": "2",
      "status": 1,
      "send_email": 1,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=d77b2ee086eca4c89cbb731c22b478f08444420ece789d73231229f2dc8db14c884b21bec0b80a4e7e1dbb9e3f53657b",
      "cude": "d77b2ee086eca4c89cbb731c22b478f08444420ece789d73231229f2dc8db14c884b21bec0b80a4e7e1dbb9e3f53657b",
      "validated": "18-09-2024 04:14:47 PM",
      "gross_value": "81232.50",
      "taxable_amount": "81232.50",
      "tax_amount": "8767.50",
      "discount_amount": "0.00",
      "surcharge_amount": "0.00",
      "total": "90000.00",
      "observation": null,
      "errors": [
        "Regla: CBF02, Notificación: No se informo el numero de la factura referenciada"
      ],
      "created_at": "18-09-2024 04:14:45 PM",
      "qr_image": "data:image/png;base64, iVBORw0KGgoAAAANS...ejemplo...riF0HJJz7ZLDOdkvRWneZZR0AMzSbeIjKrJgOORCBuPHX84aG+nfyYxCDf9RgGklIM1ab+s9938BC5MPaatkr04AAAAASUVORK5CYII=",
      "bill_id": 510,
      "cufe": "1814771d90c31ef33532e3260f6fd1a4e96ab18c098757b4cfc2ea4d6a7bcd210fbe2a3ad8a9f563b0d79e51a332b8d8",
      "number_bill": "SETP990000299",
      "payment_method": {
        "name": "Efectivo",
        "code": "10"
      },
      "customization_id": {
        "code": "20",
        "name": "Nota Crédito que referencia una factura electrónica."
      },
      "correction_concept": {
        "code": "2",
        "name": "Anulación de factura electrónica"
      }
    },
    "items": [
      {
        "note": null,
        "code_reference": "12345",
        "name": "producto de prueba",
        "quantity": 1,
        "discount_rate": "20.00",
        "discount": "8403.36",
        "gross_value": "33613.45",
        "tax_rate": "19.00",
        "taxable_amount": "33613.45",
        "tax_amount": "6386.55",
        "price": "50000.00",
        "is_excluded": 0,
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
        "tribute": {
          "id": 1,
          "code": "01",
          "name": "IVA"
        },
        "total": 40000,
        "withholding_taxes": [
          {
            "tribute_code": "05",
            "name": "ReteIVA",
            "value": "957.98",
            "rates": [
              {
                "code": "05",
                "name": "ReteIVA",
                "rate": "15.00"
              }
            ]
          },
          {
            "tribute_code": "06",
            "name": "ReteRenta",
            "value": "2352.94",
            "rates": [
              {
                "code": "06",
                "name": "ReteRenta",
                "rate": "7.00"
              }
            ]
          }
        ]
      },
      {
        "note": null,
        "code_reference": "54321",
        "name": "producto de prueba 2",
        "quantity": 1,
        "discount_rate": "0.00",
        "discount": "0.00",
        "gross_value": "47619.05",
        "tax_rate": "5.00",
        "taxable_amount": "47619.05",
        "tax_amount": "2380.95",
        "price": "50000.00",
        "is_excluded": 0,
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
        "tribute": {
          "id": 1,
          "code": "01",
          "name": "IVA"
        },
        "total": 50000,
        "withholding_taxes": []
      }
    ],
    "allowance_charges": [],
    "withholding_taxes": [
      {
        "tribute_code": "05",
        "name": "ReteIVA",
        "value": "957.98"
      },
      {
        "tribute_code": "06",
        "name": "ReteRenta",
        "value": "2352.94"
      }
    ]
  }
}

Descargar PDF
El endpoint devuelve un pdf de la factura en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/download-pdf/:number

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
number: Número de nota crédito.
Ejemplo de respuesta
status 200
status 404
status 409
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "nc09008257590002400000072",
    "pdf_base_64_encoded": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC...ejemplo...zE0NTdhYWU+XQo+PgpzdGFydHhyZWYKNjQ1OTMKJSVFT0Y="
  }
}

Descargar XML
El endpoint devuelve el xml de la nota crédito en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad xml_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/download-xml/:number

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
number: Número de nota crédito.
Ejemplo de respuesta
status 200
status 404
status 409
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "nc09008257590002400000072",
    "xml_base_64_encoded": "PD94bWwgdmVyc2lvbj0i...ejemplo...bmU+CjwvQ3JlZGl0Tm90ZT4="
  }
}

Obtener contenido de correo
Este endpoint permite obtener el asunto y el zip adjunto (en formato Base64) que normalmente se envían al cliente por correo electrónico. Está diseñado para escenarios en los que el envío automático del correo ha sido deshabilitado (send_email = false), permitiendo así que el integrador gestione manualmente el envío del correo al cliente final. El archivo adjunto corresponde al archivo zip que contiene el pdf de la nota crédito y el attached document que se enviaría en el correo oficial.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/:number/email-content

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
number: Número de factura.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "subject": "900825759;HALLTEC S.A.S.;NC150;91;HALLTEC S.A.S.",
    "attached_document": "UEsDBBQAAgAIALx01FpAfoqG1JgAAFioAAAdA...ejemplo...OTMueG1sUEsFBgAAAAACAAIAlgAAAG6+AAAAAA=="
  }
}

Eliminar Nota Crédito
Elimina una nota crédito usando el código de referencia con el cual se creó. Las notas crédito se pueden eliminar siempre y cuando no se encuentren validadas por la DIAN. Se suele eliminar una nota crédito cuando contiene errores de validación notificados por la DIAN para crearla nuevamente corregida.

Método: DELETE

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/reference/:reference_code

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
reference_code: Código de referencia de la nota crédito.
Ejemplo de respuesta
status 200
status 404
status 409
{
  "status": "OK",
  "message": "Documento con código de referencia 6 eliminado con éxito"
}

Enviar correo
Este endpoint envía por correo electrónico la nota crédito en un archivo ZIP que incluye un PDF y un archivo XML (AttachedDocument). El PDF puede ser generado y enviado en formato Base64. En caso de no proporcionarse, se utilizará por defecto la representación gráfica generada por el sistema.

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/credit-notes/send-email/:number

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
number: Número de la nota crédito.
Parámetros del Cuerpo (Body)
El cuerpo (Body) de la solicitud debe enviarse en formato JSON y debe incluir los siguientes parámetros:

Parámetro y Tipo	Descripción
email (string)	Correo electrónico al cual se desea enviar la nota crédito
pdf_base_64_encoded (string)	(Opcional) PDF, enviado como cadena codificada en Base64
Ejemplo de Solicitud
Aquí tienes un ejemplo de cómo debería quedar el cuerpo de la solicitud en formato JSON:

200 - Envío de correo
{
  "email": "alanturing@enigmasas.com.com",
  "pdf_base_64_encoded": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC...ejemplo..ZjQxODgyMDM+XQo+PgpzdGFydHhyZWYKNDQ5MzEKJSVFT0Y="
}

Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Nota crédito enviada al cliente con éxito"
}