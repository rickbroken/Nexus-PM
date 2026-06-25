Cargar Factura
Endpoint
   https://api-sandbox.factus.com.co/v1/receptions/upload

Descripción
Este endpoint se utiliza para cargar las facturas electrónicas que hayan sido generadas por una persona o empresa (emisor/facturador).

ID	Descripción
track_id	CUFE de la factura electrónica
Descripción de la response cuando el código de estado es 201
Campo	Descripción
ID	ID del registro.
issue_date	Fecha en la que se emitió la factura.
issue_time	Hora en la que se emitió la factura.
payment_due_date	Fecha de vencimiento de la factura.
number	Número de la factura.
cufe	CUFE de la factura.
company_identification_type_code	Código de tipo de identificación de la persona o empresa (emisor/facturador).
company_nit	NIT de la persona o empresa (emisor/facturador).
dv	Dígito de verificación de la persona o empresa (emisor/facturador).
company_name	Nombre o razón social de la persona o empresa (emisor/facturador).
payment_form[code]	Código de la forma de pago.
payment_form[name]	Nombre de la forma de pago.
payment_method[code]	Código del método de pago.
payment_method[name]	Nombre del método de pago.
total	Total de la factura.
has_claim	Booleano que indica si la factura tiene el evento de reclamo.
is_negotiable_instrument	Booleano que indica si la factura se encuentra como título valor.
events	Array que contiene los eventos generados a la factura.
events.*.[number]	Número del evento.
events.*.[cude]	CUDE del evento.
events.*.[code]	Código del evento.
events.*.[name]	Nombre del evento.
events.*.[effective_date]	Fecha en la que se emitió el evento.
events.*.[effective_time]	Hora en la que se emitió el evento.
events.*.[person_identification]	Número de identificación de la persona del evento.
events.*.[person_names]	Nombre de la persona del evento.
created_at	Fecha en la que se cargó el documento a la API de Factus.
Autorización
Authorization: Bearer Token
Esta solicitud utiliza un authorization helper de la colección API Factus.
Encabezados de la Solicitud (Request Headers)
Accept: application/json

Ver Facturas
Endpoint
   https://api-sandbox.factus.com.co/v1/receptions/bills?filter[id]=&filter[number]=&filter[issue_date]&filter[cufe]&filter[company_nit]&filter[company_name]&filter[completed_events]=

Descripción
Obtiene y filtra las facturas electrónicas.

Campo	Descripción
ID	ID del registro.
number	Número de la factura.
issue_date	Fecha en la que se emitió la factura.
issue_time	Hora en la que se emitió la factura.
cufe	CUFE de la factura.
company_nit	NIT de la persona o empresa (emisor/facturador).
company_name	Nombre o razón social de la persona o empresa (emisor/facturador).
payment_form[code]	Código de la forma de pago.
payment_form[name]	Nombre de la forma de pago.
claim_concept	Array que contiene la información del motivo del reclamo, en caso de que se haya generado uno.
claim_concept[code]	Código del motivo del reclamo.
claim_concept[name]	Nombre del motivo del reclamo.
payment_due_date	Fecha de vencimiento de la factura.
is_negotiable_instrument	Booleano que indica si la factura se encuentra como título valor o no.
has_claim	Booleano que indica si se ha generado un evento de reclamo a la factura.
total	Total de la factura.
created_at	Fecha en la que se cargó el documento a la API de Factus.
Autorización
Authorization: Bearer Token
Esta solicitud utiliza un authorization helper de la colección API Factus.
Encabezados de la Solicitud (Request Headers)
Accept: application/json
Parámetros de Consulta (Query Params)
filter[id]: ID de la factura
filter[number]: Número de la factura
filter[issue_date]: Fecha de emisión de la factura
filter[cufe]: CUFE de la factura
filter[company_nit]: NIT de la empresa o persona que te emitió la factura
filter[company_name]: Nombre de la persona o empresa que te emitió la factura
filter[completed_events]: Usa 1 para listar las facturas que no tienen eventos pendientes por emitir y 0 para mostrar las facturas que tienen eventos pendientes por emitir.


Emitir Evento
Endpoint
   https://api-sandbox.factus.com.co/v1/receptions/bills/:bill_id/radian/events/:event_type

Descripción
En este end point podrás emitir los siguientes eventos:

Eventos de la Factura Electrónica
1. Acuse de recibo de Factura Electrónica de Venta
Este evento se emite para confirmar que has recibido la factura electrónica, ya sea en físico o a través de un medio electrónico.

2. Recibo del bien o prestación del servicio
Este evento se emite cuando has recibido los bienes (productos) o servicios que adquiriste y que están especificados en la factura.

nota

Para emitir este evento, es obligatorio haber generado previamente el Acuse de recibo de Factura Electrónica de Venta.

3. Reclamo de la Factura Electrónica de Venta
Este evento se emite en caso de que la factura presente alguna inconsistencia, como la entrega parcial o total de los productos, o si el servicio no fue prestado.

nota

Para emitir este evento, es obligatorio haber generado previamente el Recibo del bien o prestación del servicio.

4. Aceptación expresa
Este evento se emite para indicar que estás de acuerdo con la factura recibida, y que los productos han sido entregados o el servicio ha sido prestado satisfactoriamente.

importante

Una vez que emitas este evento, ya no será posible generar otros eventos, notas crédito ni modificar el estado de la factura como Título Valor en el sistema RADIAN.

5. Aceptación tácita
Este evento no puede ser emitido por ti. Será generado automáticamente por la persona o empresa (facturador/emisor) de la factura si, pasados tres (3) días hábiles desde la emisión del evento Recibo del bien o prestación del servicio, no has emitido un Reclamo de la Factura Electrónica de Venta o una Aceptación expresa.

importante

Una vez que se genere este evento, ya no será posible emitir otros eventos, notas crédito ni modificar el estado de la factura como Título Valor en el sistema RADIAN.

Tabla de Códigos de Eventos
Código	Nombre
030	Acuse de recibo de Factura Electrónica de Venta
031	Reclamo de la Factura Electrónica de Venta
032	Recibo del bien y/o prestación del servicio
033	Aceptación expresa
034	Aceptación tácita
Descripción del body
Se envían los datos de la persona del evento. Los datos de la persona pueden cambiar dependiendo del evento:

Acuse de recibo de Factura Electrónica de Venta: debes agregar los datos de la persona que recibió la factura.
Reclamo de la Factura Electrónica de Venta: debes agregar los datos de la persona que hizo el reclamo.
Recibo del bien y/o prestación del servicio: debes agregar los datos de la persona que recibió los bienes (productos) o servicio.
Aceptación expresa: debes agregar los datos de la persona que acepto expresamente la factura y los bienes (productos) y servicios.

Tabla de Descripción de Campos
ID	Descripción
claim_concept_code	(Opcional) Requerido si se envía el evento de Reclamo de la Factura Electrónica de Venta.
Nota: Para saber los códigos de los conceptos, consulta la tabla Códigos conceptos de reclamo.
identification_document_code	Código del tipo de identificación de la persona.
Nota: Consulta la tabla Códigos tipos de documentos de identidad que se encuentra en la introducción de esta documentación.
identification	Número de identificación de la persona.
dv	(Opcional) Requerido si la persona se identifica con NIT (identification_document_code=6).
first_name	Nombre de la persona.
last_name	Apellidos de la persona.
job_title	(Opcional) Cargo que tiene la persona.
organization_department	(Opcional) Departamento al que pertenece el cargo que tiene la persona.
Autorización
Authorization: Bearer Token
Esta solicitud utiliza un authorization helper de la colección API Factus.
Encabezados de la Solicitud (Request Headers)
Accept: application/json
Variables de Ruta (Path Variables)
bill_id ID de la factura electrónica
event_type Código del evento a emitir