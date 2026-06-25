
Introducción
El endpoint Crear Factura expone diversas funcionalidades necesarias para el correcto envío y creación de facturas. Este documento describe los recursos disponibles, las configuraciones requeridas y los parámetros que debe considerar.

Recursos disponibles
Los siguientes endpoints están disponibles para obtener información de uso frecuente. Recomendamos hacerla persistente en su sistema, ya que rara vez se modifica, o usar los endpoints directamente (teniendo en cuenta los tiempos de respuesta):

Rangos de numeración
Municipios
Tributos
Unidades de medida
Nota

Es necesario incluir un access_token válido al enviar la factura. > Para aprender cómo generar el token, utilice el endpoint de autenticación: Auth Endpoint. Importante: El token de acceso tiene una duración de 1 hora.

Datos requeridos para crear una factura
Para comprender los datos requeridos, revise el cuerpo (body) que se debe enviar en la solicitud al endpoint

Crear Factura

Si tiene dudas con algún campo revise la descripción de los campos en la sección de

Campos

Endpoint - Crear y Validar Factura
Método	URL
POST	/crear-validar-factura
Configuración de la solicitud
Encabezados (Headers)
Parámetro	Tipo	Descripción	Requerido
access_token	string	Token de acceso generado previamente	✅
Content-Type	string	Tipo de contenido: application/json	✅
Accept	string	Tipo de respuesta: application/json	✅
Cuerpo (Body)
Parámetro	Tipo	Descripción	Requerido
body	object	Información de la factura a crear y validar	✅

Factura avanzada
Esta sección describe cómo utilizar el endpoint para crear y validar una factura, junto con la información necesaria para garantizar su correcto uso.

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/validate

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

Endpoints para Datos de Facturación
Factus ofrece una serie de endpoints de apoyo diseñados para simplificar el proceso de creación de facturas. Estos datos son de uso recurrente y, dado que rara vez se actualizan, se recomienda almacenarlos de manera persistente en su sistema. Esto no solo evita consultas repetitivas, sino que también mejora significativamente los tiempos de respuesta. Sin embargo, si opta por consultarlos dinámicamente, es importante evaluar el impacto en el rendimiento del sistema.

Rangos de numeración
Municipios
Tributos
Unidades de medida
Estructura para crear la factura
Para crear una factura debemos tener en cuenta los datos agrupados en 3 aspectos:

Datos generales de la factura
Datos del cliente
Datos de los productos o servicios.
Parámetros del Cuerpo (Body)
El cuerpo (Body) de la solicitud debe enviarse en formato JSON y debe incluir los siguientes parámetros:

Parámetro y Tipo	Descripción
numbering_range_id (integer)	ID del rango de numeración. Para saber cuál es el ID de cada rango de numeración consulte el siguiente endpoint rangos de numeración . Si tienes en la API un solo un rango de numeración activo para la facturación electrónica, este campo puede ser opcional. Si no envías el rango de numeración, la API tomará el único rango de numeración que esté activo. Si hay más de un rango de numeración para la facturación, este campo es obligatorio.
document(string)	(opcional) Código del tipo de documento. Para saber el código que pertenece a un documento consulte la tabla códigos de tipos de documentos
reference_code (string)	Código único que sirve para identificar cada factura de manera unívoca en el sistema y garantizar que no haya duplicados. Esto nos ayuda a prevenir que se genere más de una factura con la misma información.
observation (string)	Agrega una observación a la factura. No debe tener más de 250 caracteres.
payment_form (object)	(Opcional) Código de la forma de pago. Si la forma de pago no se agrega, por defecto la API agrega el código 1 (pago de contado). Consulte la tabla Formas de pago para ver las formas de pago disponibles.
payment_due_date (date)	(Opcional) Fecha de vencimiento de la factura en formato YYYY-MM-DD. Requerido solo cuando la forma de pago (payment_form) contiene el valor de 2 (pago a crédito).
payment_method_code (integer)	(Opcional) Código del método de pago. Si el medio de pago no se agrega, por defecto la API agrega el código 10 (efectivo). Para saber cuál es el código de cada método de pago consulte la tabla Métodos de pago .
operation_type (string)	(Opcional) Código del tipo de operación. Si el tipo de operación no se agrega, por defecto la API agrega el código 10 (estándar). Consulte la tabla Tipos de operación para ver los tipos de operación disponibles.
order_reference (Object)*	(Opcional) Este es un objeto que contendrá la información que describen una orden de pedido
order_reference.reference_code	Número del documento de la orden.
order_reference.issue_date	(Opcional) Fecha de emisión de la orden.
send_email	(Opcional) Booleano que indica si el sistema debe enviar el correo electrónico al cliente. Útil cuando el envío del correo se gestiona de forma externa o personalizada por el integrador. Por defecto, este campo tiene un valor de true, lo que implica que el correo electrónico será enviado al cliente. Si se establece en false, el correo no será enviado..
related_documents (array)	(Opcional) Array de objetos (documentos), debe haber un objeto por cada documento. Obligatorio cuando el campo (document) contenga el valor 03.
related_documents.code (array)	Identificador del tipo de documento de referencia. (Corresponde a una codificación propia de la empresa).
related_documents.issue_date (array)	Fecha de emisión del documento referenciado en formato YYYY-MM-DD.
related_documents.number (array)	Prefijo y Número del documento referenciado.
billing_period (Object)*	(Opcional) Este es un objeto que contendrá la información del periodo de facturación. Para utilizar en los servicios públicos, contratos de arrendamiento, matriculas en educación, etc. Ver el ejemplo en el body.
billing_period.start_date	Fecha de inicio del periodo de facturación en formato YYYY-MM-DD.
billing_period.start_time	(Opcional) Hora de inicio del periodo de facturación en formato HH:mm:ss.
billing_period.end_date	Fecha de fin del periodo de facturación en formato YYYY-MM-DD.
billing_period.end_time	Hora de fin del periodo de facturación en formato HH:mm:ss.
establishment (object)	(Opcional) Objeto que contendrá la información sobre el establecimiento. Úsalo cuando manejes más de un establecimiento y necesites que los datos correspondientes se reflejen en la factura.
establishment.name (string)	Nombre del establecimiento.
establishment.address (string)	Dirección del establecimiento.
establishment.phone_number (string)	Número telefónico del establecimiento.
establishment.email (string)	Correo electrónico del establecimiento.
establishment.municipality_id (integer)	ID que corresponda al Municipio donde se encuentra el establecimiento. Para saber cual ID corresponde al municipio consulte el endpoint de Municipios
customer (object)	Este es un objeto que contendrá la información del cliente de la factura.
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
items (array)	El array de objetos (items), corresponde a los productos de la factura, se debe enviar un objeto por cada producto o servicio.
items.scheme_id (string)	(opcional) Este campo es requerido si el campo operation_type contiene el valor de 11 (mandatos). Agregue el valor de 0 cuando sea ingreso propio y 1 ingresos recibidos para terceros.
items.note (string)	(opcional) Añade información adicional del producto o servicio.
items.code_reference (string)	Código de referencia del producto o servicio.
items.name (string)	Nombre del producto o servicio.
items.quantity (integer)	Cantidad del producto o servicio. Debe ser un número entero.
items.discount_rate (float)	Porcentaje del descuento del producto o servicio (máximo dos decimales).
items.price (float)	Precio por unidad del producto o servicio con impuestos incluidos (máximo dos decimales).
items.tax_rate (string)	Porcentaje del impuesto aplicado al producto o servicio.
items.unit_measure_id (integer)	ID que corresponda a la unidad de medida del item. Para saber que ID corresponde a cada unidad de medida consulte el endpoint Unidades de medida.
items.standard_code_id (integer)	ID que corresponde al código de estándar que se adopto para los productos o servicios. Para saber que ID corresponde al código de estándar consulte la tabla IDs de códigos de estándar.
items.is_excluded (integer)	Si el producto está excluido de IVA (0: no, 1: sí).
items.tribute_id (integer)	Tipo de tributo aplicado. Se consume del endpoint de tributos de productos. .
items.withholding_taxes (array)	(Opcional) Array de objetos (autorretenciones) Este campo sirve para informar las retenciones en la fuente que se aplican al producto o servicio.
No son retenciones que otra persona o empresa te hace a ti, sino retenciones que tú mismo te aplicas como contribuyente.
Por cada retención que te apliques a ti mismo, debes enviar un objeto.
items.withholding_taxes.code (string)	Código relacionado con la retención aplicada al producto o servicio. Para saber los códigos de las retenciones consulte la tabla tributos.
items.withholding_taxes.withholding_tax_rate (float)	Porcentaje de la retención aplicada al producto o servicio. El valor se maneja con máximos 2 decimales
items.mandate (object)	(opcional) Este campo es requerido si el campo items.scheme_id contiene el valor 1 (Ingresos recibidos para terceros). Este es un objeto que contendrá la información del mandante.
items.mandate.identification_document_id (integer)	ID que corresponda al tipo de identificación. Para saber cual ID corresponde al tipo de identificación consulte la siguiente tabla IDs tipos de documentos.
items.mandate.identification (string)	Número de identificación del mandante.
allowance_charges (array)	(Opcional) Array de objetos que corresponden a los descuentos o recargos que se aplican a la factura, se debe enviar un objeto por cada descuento o recargo.
allowance_charges.concept_type (string)	Código del tipo de descuento o recargo. Para saber el código que pertenece a un descuento o recargo consulte la tabla Códigos de los conceptos
allowance_charges.is_surcharge (boolean)	Indica si es un descuento o un recargo. El valor true corresponde a un recargo y false a un descuento.
allowance_charges.reason (string)	Razón por la cual se esta haciendo el descuento o recargo.
allowance_charges.base_amount (float)	Base sobre la cual se calcula el descuento o recargo (Máximo dos decimales).
allowance_charges.amount (float)	Valor monetario del descuento o recargo aplicado, (Máximo dos decimales).
Ejemplo de Solicitud
Aquí tienes un ejemplo de cómo debería quedar el cuerpo de la solicitud en formato JSON:

201 - Factura de venta
201 - Instrumento electrónico de transmisión
{
  "document": "01",
  "numbering_range_id": 4,
  "reference_code": "fact0022025",
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
      "code_reference": "12345",
      "name": "producto de prueba",
      "quantity": 1,
      "discount_rate": 20,
      "price": 50000,
      "tax_rate": "19.00",
      "unit_measure_id": 70,
      "standard_code_id": 1,
      "is_excluded": 0,
      "tribute_id": 1,
      "withholding_taxes": [
        {
          "code": "06",
          "withholding_tax_rate": 7.38
        },
        {
          "code": "05",
          "withholding_tax_rate": 15.12
        }
      ]
    },
    {
      "code_reference": "54321",
      "name": "producto de prueba 2",
      "quantity": 1,
      "discount_rate": 0,
      "price": 50000,
      "tax_rate": "5.00",
      "unit_measure_id": 70,
      "standard_code_id": 1,
      "is_excluded": 0,
      "tribute_id": 1,
      "withholding_taxes": []
    }
  ],
  "allowance_charges": [
    {
      "concept_type": "03",
      "is_surcharge": true,
      "reason": "Propina",
      "base_amount": "90000.00",
      "amount": "9000.00"
    }
  ]
}

Ejemplo de respuesta
201 - Factura de venta
201 - Instrumento electrónico de transmisión
Status 409
Status 422
{
  "status": "Created",
  "message": "Documento con el código de referencia fact0022025 registrado y validado con éxito",
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
    "numbering_range": {
      "prefix": "SETP",
      "from": 990000000,
      "to": 995000000,
      "resolution_number": "18760000001",
      "start_date": "19-01-2019",
      "end_date": "19-01-2030",
      "months": 132
    },
    "billing_period": [],
    "bill": {
      "id": 820,
      "document": {
        "code": "01",
        "name": "Factura electrónica de Venta"
      },
      "operation_type": {
        "code": "10",
        "name": "Estándar"
      },
      "order_reference": null,
      "number": "SETP990000493",
      "reference_code": "fact0022025",
      "status": 1,
      "send_email": 0,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=44e260a76e092e46fd5d8344a03146d5c8863ab68b18bde38a53318a33bf6805bac75f0bd71b0b75b3bd9c747a629470",
      "cufe": "44e260a76e092e46fd5d8344a03146d5c8863ab68b18bde38a53318a33bf6805bac75f0bd71b0b75b3bd9c747a629470",
      "validated": "09-01-2025 01:56:16 PM",
      "gross_value": "81232.50",
      "taxable_amount": "81232.50",
      "tax_amount": "8767.50",
      "discount_amount": "0.00",
      "surcharge_amount": "9000.00",
      "total": "99000.00",
      "observation": null,
      "errors": [],
      "created_at": "09-01-2025 01:56:13 PM",
      "payment_due_date": null,
      "qr_image": "data:image/png;base64, iVBORw0KGgoAA..ejemplo..I4Sn5eBXgjKEGnV0Ap5Uko9u10rBJWbo5SbHX44sBtp7oc+7/AGlnba2VlAFvAAAAAElFTkSuQmCC",
      "has_claim": 0,
      "is_negotiable_instrument": 0,
      "payment_form": {
        "code": "1",
        "name": "Pago de contado"
      },
      "payment_method": {
        "code": "10",
        "name": "Efectivo"
      }
    },
    "related_documents": [],
    "items": [
      {
        "scheme_id": null,
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
        ],
        "mandate": null
      },
      {
        "scheme_id": null,
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
    "allowance_charges": [
      {
        "concept_type": {
          "code": "03",
          "name": "Recargo Condicionado"
        },
        "is_surcharge": true,
        "reason": "Propina",
        "base_amount": "90000.00",
        "percentage": "10.00",
        "amount": "9000.00"
      }
    ],
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
    ],
    "mandate": null,
    "credit_notes": [],
    "debit_notes": []
  }
}


Ver y Filtrar Facturas
Esta sección explica cómo utilizar este endpoint para buscar y filtrar los registros de facturas.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills?filter[identification]&filter[names]&filter[number]&filter[prefix]&filter[reference_code]&filter[status]

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
filter[number]: Filtra por el número de factura.
filter[prefix]: Filtra por el prefijo de factura.
filter[reference_code]: Filtra por código de referencia.
filter[status]: Filtra por el estado del la factura (1=validada, 0= pendiente por validar).
Respuesta del Endpoint
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "data": [
      {
        "id": 400,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000203",
        "api_client_name": "Halltec",
        "reference_code": "I3",
        "identification": "123456789",
        "graphic_representation_name": "Alan Turing",
        "company": "",
        "trade_name": "",
        "names": "Alan Turing",
        "email": "alanturing@enigmasas.com",
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 1,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "17-07-2024 03:54:10 PM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 397,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000202",
        "reference_code": null,
        "identification": "1100970785",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": "pepito@hotmail.com",
        "total": "50000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 1,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "17-07-2024 09:57:47 AM",
        "credit_notes": [
          {
            "id": 105,
            "number": "NC62"
          }
        ],
        "debit_notes": [
          {
            "id": 43,
            "number": "ND28"
          }
        ]
      },
      {
        "id": 396,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000201",
        "reference_code": null,
        "identification": "1100970785",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": "pepito@hotmail.com",
        "total": "27000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 1,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "17-07-2024 09:46:05 AM",
        "credit_notes": [
          {
            "id": 106,
            "number": "NC63"
          }
        ],
        "debit_notes": []
      },
      {
        "id": 386,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000200",
        "reference_code": null,
        "identification": "12345666",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": "pepito@hotmail.com",
        "total": "27000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 1,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "16-07-2024 09:44:08 PM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 377,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000199",
        "reference_code": null,
        "identification": "06141002791018",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": "",
        "names": "Pepito Perez",
        "email": null,
        "total": "50000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 0,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "08-07-2024 04:24:27 PM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 376,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000198",
        "reference_code": null,
        "identification": "900825759",
        "graphic_representation_name": "Halltec S.a.s",
        "company": "Halltec S.a.s",
        "trade_name": null,
        "names": "",
        "email": null,
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 0,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "08-07-2024 04:15:06 PM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 375,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000197",
        "reference_code": null,
        "identification": "900825759",
        "graphic_representation_name": "Halltec S.a.s",
        "company": "Halltec S.a.s",
        "trade_name": null,
        "names": "",
        "email": null,
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 0,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "08-07-2024 03:43:33 PM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 374,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000196",
        "reference_code": null,
        "identification": "9247016",
        "graphic_representation_name": "Ryley Von",
        "company": "",
        "trade_name": "",
        "names": "Ryley Von",
        "email": "sydnie27@hotmail.com",
        "total": "90000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 1,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "08-07-2024 03:31:22 PM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 373,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000195",
        "reference_code": null,
        "identification": "222222222222",
        "graphic_representation_name": "Consumidor final",
        "company": "",
        "trade_name": null,
        "names": "Consumidor final",
        "email": "",
        "total": "20000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 0,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "01-07-2024 11:17:59 AM",
        "credit_notes": [],
        "debit_notes": []
      },
      {
        "id": 372,
        "document": {
          "code": "01",
          "name": "Factura electrónica de Venta"
        },
        "number": "SETP990000194",
        "reference_code": null,
        "identification": "122345566",
        "graphic_representation_name": "Pepito Perez",
        "company": "",
        "trade_name": null,
        "names": "Pepito Perez",
        "email": "pepito@hotmail.com",
        "total": "20000.00",
        "status": 1,
        "errors": [
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado.",
          "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suministrado."
        ],
        "send_email": 1,
        "has_claim": 0,
        "is_negotiable_instrument": 0,
        "payment_form": {
          "code": "1",
          "name": "Pago de contado"
        },
        "created_at": "27-06-2024 04:48:24 PM",
        "credit_notes": [],
        "debit_notes": []
      }
    ],
    "pagination": {
      "total": 162,
      "per_page": 10,
      "current_page": 1,
      "last_page": 17,
      "from": 1,
      "to": 10,
      "links": [
        {
          "url": null,
          "label": "&laquo; Anterior",
          "active": false
        },
        {
          "url": "http://api.test/v1/bills?page=1",
          "label": 1,
          "active": true,
          "page": 1
        },
        {
          "url": "http://api.test/v1/bills?page=2",
          "label": 2,
          "active": false,
          "page": 2
        },
        {
          "url": "http://api.test/v1/bills?page=3",
          "label": 3,
          "active": false,
          "page": 3
        },
        {
          "url": "http://api.test/v1/bills?page=4",
          "label": 4,
          "active": false,
          "page": 4
        },
        {
          "url": null,
          "label": "...",
          "active": false
        },
        {
          "url": "http://api.test/v1/bills?page=17",
          "label": 17,
          "active": false,
          "page": 17
        },
        {
          "url": "http://api.test/v1/bills?page=2",
          "label": "Siguiente &raquo;",
          "active": false
        }
      ]
    }
  }
}

El endpoint devuelve información paginada de las facturas, incluyendo:

total: Total de las facturas.
por página: 10 resultados por página.
página actual: Página en la que se encuentra.
última página: Última página disponible.
desde: Índice inicial de los resultados.
hasta: Índice final de los resultados.
links: Navegación entre las páginas del endpoint.
Para navegar entre las páginas, utilice el parámetro de consulta page y especifique el número de página deseado.
Si el número de página no existe, el objeto data estará vacío.

Ver Factura
El endpoint devuelve una factura específica pasando el número de la factura como parámetro en la solicitud GET. Puede encontrar el número de la factura, debe revisar la respuesta de la creación de la factura o en filtrar facturas , data.bill.number .

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/show/:number

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
  "status": "Created",
  "message": "Documento con el código de referencia fact0022025 registrado y validado con éxito",
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
    "establishment": {
      "name": "SuperMarket",
      "address": "calle 10 # 3-13",
      "phone_number": "0987654321",
      "email": "supermarket@gmail.com",
      "municipality_id": {
        "id": 996,
        "code": 68872,
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
    "numbering_range": {
      "prefix": "SETP",
      "from": 990000000,
      "to": 995000000,
      "resolution_number": "18760000001",
      "start_date": "19-01-2019",
      "end_date": "19-01-2030",
      "months": 132
    },
    "billing_period": [],
    "bill": {
      "id": 820,
      "document": {
        "code": "01",
        "name": "Factura electrónica de Venta"
      },
      "operation_type": {
        "code": "10",
        "name": "Estándar"
      },
      "number": "SETP990000493",
      "reference_code": "fact0022025",
      "order_reference": null,
      "status": 1,
      "send_email": 0,
      "qr": "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=44e260a76e092e46fd5d8344a03146d5c8863ab68b18bde38a53318a33bf6805bac75f0bd71b0b75b3bd9c747a629470",
      "cufe": "44e260a76e092e46fd5d8344a03146d5c8863ab68b18bde38a53318a33bf6805bac75f0bd71b0b75b3bd9c747a629470",
      "validated": "09-01-2025 01:56:16 PM",
      "gross_value": "81232.50",
      "taxable_amount": "81232.50",
      "tax_amount": "8767.50",
      "discount_amount": "0.00",
      "surcharge_amount": "0.00",
      "total": "90000.00",
      "observation": null,
      "errors": [],
      "created_at": "09-01-2025 01:56:13 PM",
      "payment_due_date": null,
      "qr_image": "data:image/png;base64, iVBORw0KGgoAA...ejemplo..jKEGnV0Ap5Uko9u10rBJWbo5SbHX44sBtp7oc+7/AGlnba2VlAFvAAAAAElFTkSuQmCC",
      "has_claim": 0,
      "is_negotiable_instrument": 0,
      "payment_form": {
        "code": "1",
        "name": "Pago de contado"
      },
      "payment_method": {
        "code": "10",
        "name": "Efectivo"
      }
    },
    "related_documents": [],
    "items": [
      {
        "scheme_id": null,
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
        ],
        "mandate": null
      },
      {
        "scheme_id": null,
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
        "withholding_taxes": [],
        "mandate": null
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
    ],
    "credit_notes": [],
    "debit_notes": []
  }
}

Descargar PDF
El endpoint devuelve un pdf de la factura en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/download-pdf/:number

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
    "file_name": "fv09008257590002400000241",
    "pdf_base_64_encoded": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9...ejemplo...YXJ0eHJlZgo2NDEzNgolJUVPRg=="
  }
}

Obtener contenido de correo
Este endpoint permite obtener el asunto y el zip adjunto (en formato Base64) que normalmente se envían al cliente por correo electrónico. Está diseñado para escenarios en los que el envío automático del correo ha sido deshabilitado (send_email = false), permitiendo así que el integrador gestione manualmente el envío del correo al cliente final. El archivo adjunto corresponde al archivo zip que contiene el pdf de la factura y el attached document que se enviaría en el correo oficial.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/:number/email-content

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
    "subject": "901724254;FACTUS SAS;SETP990000748;01;FACTUS SAS",
    "attached_document": "UEsDBBQAAgAIANVy1Frhn0J08qUAAL+0AAAd...ejemplo...tbFBLBQYAAAAAAgACAJYAAADFywAAAAA="
  }
}

Descargar XML
El endpoint devuelve el xml de la factura en formato Base64 y el nombre del archivo asociado.
Para utilizar el archivo, deberás decodificar el contenido de la propiedad pdf_base_64_encoded.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/download-xml/:number

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
status 200
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": {
    "file_name": "fv09008257590002400000241",
    "xml_base_64_encoded": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNv...ejemplo...+CjwvSW52b2ljZT4="
  }
}

Eliminar Factura No Validada
Elimina una factura usando el código de referencia con el cual se creó. Las facturas se pueden eliminar siempre y cuando no se encuentren validadas por la DIAN. Se suele eliminar una factura cuando contiene errores de validación notificados por la DIAN para crearla nuevamente corregida.

Método: DELETE

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/destroy/reference/:reference_code

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
reference_code: Código de referencia de la factura.
Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Documento con código de referencia <reference_code> eliminado con éxito"
}

Eventos de Facturas
Este endpoint permite consultar los eventos generados a una factura por su número de factura.

Método: GET

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/:number/radian/events

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

Descripción de la respuesta
La respuesta devuelve un array de objetos que contiene la información de cada evento.

ID	Descripción
number	Número del evento.
cude	CUDE del evento.
event_code	Código del evento.
event_name	Nombre del evento.
effective_date	Fecha de emisión del evento.
effective_time	Hora de emisión del evento.
Variables de Ruta (Path Variables)
number
Ejemplo de respuesta
status 200
status 400
{
  "status": "OK",
  "message": "Solicitud exitosa",
  "data": [
    {
      "number": "AP68",
      "cude": "b02f0eae4978c1a01cc0e7bddf6d9e8384f0b339ad6dcc1c7e42b6dfebfe6c26ee98512991c8ead8cd665c353e05684c",
      "event_code": "030",
      "event_name": "Acuse de recibo de Factura Electrónica de Venta",
      "effective_date": "2024-11-05",
      "effective_time": "16:36:31"
    },
    {
      "number": "AP69",
      "cude": "09a0d55bc4752970b1d0afa4642ba3ab39fadbd5a2c90162711d47d4b7b50097fcca6e19330e568c1a307e4ab10fafbb",
      "event_code": "032",
      "event_name": "Recibo del bien y/o prestación del servicio",
      "effective_date": "2024-11-05",
      "effective_time": "16:36:48"
    },
    {
      "number": "AP70",
      "cude": "ca09d728edc8a37c19edbc99fe8c30b9090499ab01e5a964477691247ebe768da89ca8a68770ba51575744e304748dcb",
      "event_code": "033",
      "event_name": "Aceptación expresa",
      "effective_date": "2024-11-05",
      "effective_time": "16:37:09"
    }
  ]
}

Aceptación Tacita
Este evento permite emitir el evento de aceptación tacita. Este evento solo es valido para las facturas generadas con la forma de pago a crédito.

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/radian/events/update/:number/:event_type

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

Parámetros del Cuerpo (Body)
Nota

Aquí se agregaran los datos de la persona responsable que emite el evento.

El cuerpo (Body) de la solicitud debe enviarse en formato JSON y debe incluir los siguientes parámetros:

Parámetro y Tipo	Descripción
identification_document_code (int)	ID de tipo de identificación
identification (string)	Número de identificación
dv (string)	(opcional) Solo es requerido cuando la persona se identifica por RUT
first_name (string)	Nombres de la persona
last_name (string)	Apellidos de la persona
job_title (string)	(opcional) Cargo en la empresa
organization_department (string)	(opcional) Área o departamento de la persona en la empresa
Variables de Ruta (Path Variables)
number: Número de factura.
event_type: código del evento. Para ver el código que pertenece a la aceptación tacita, puede consultar la tabla eventos .
Ejemplo de solicitud
example
{
  "identification_document_code": "13",
  "identification": "12345667",
  "dv": "",
  "first_name": "Pepito",
  "last_name": "Perez",
  "job_title": "Desarrollador de software",
  "organization_department": "Sistemas"
}

Enviar correo
Este endpoint envía por correo electrónico la factura en un archivo ZIP que incluye un PDF y un archivo XML (AttachedDocument). El PDF puede ser generado y enviado en formato Base64. En caso de no proporcionarse, se utilizará por defecto la representación gráfica generada por el sistema.

Método: POST

Endpoint
Pruebas
Producción
https://api-sandbox.factus.com.co/v1/bills/send-email/:number

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
Parámetros del Cuerpo (Body)
El cuerpo (Body) de la solicitud debe enviarse en formato JSON y debe incluir los siguientes parámetros:

Parámetro y Tipo	Descripción
email (string)	Correo electrónico al cual se desea enviar la factura
pdf_base_64_encoded (string)	(Opcional) PDF, enviado como cadena codificada en Base64
Ejemplo de Solicitud
Aquí tienes un ejemplo de cómo debería quedar el cuerpo de la solicitud en formato JSON:

200 - Envío de correo
{
  "email": "alanturing@enigmasas.com",
  "pdf_base_64_encoded": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlb...ejemplo...QxODgyMDM+XQo+PgpzdGFydHhyZWYKNDQ5MzEKJSVFT0Y="
}

Ejemplo de respuesta
status 200
{
  "status": "OK",
  "message": "Factura enviada al cliente con éxito"
}