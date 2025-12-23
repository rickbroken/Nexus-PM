# NexusPM - Sistema de Gestión de Proyectos

Sistema completo de gestión de proyectos para empresas de desarrollo de software, construido con React 18 + Vite + TypeScript + Supabase.

---

## 🗄️ CONFIGURACIÓN DE BASE DE DATOS

### ⚡ Inicio Rápido - Nueva Instalación

**Para configurar la base de datos desde cero, usa los scripts SQL organizados:**

📂 **Directorio**: `/database/`

🚀 **Guía rápida**: [`/database/QUICK_START.md`](./database/QUICK_START.md) ← **EMPIEZA AQUÍ** (10 minutos)

📖 **Documentación completa**: [`/database/README.md`](./database/README.md)

### 📋 Scripts SQL Disponibles (Ejecutar en Orden)

| # | Script | Descripción | Tiempo |
|---|--------|-------------|--------|
| 0️⃣ | `00_verify_installation.sql` | Verificar instalación completa | 30 seg |
| 1️⃣ | `01_setup_tables.sql` | Crear todas las tablas | 2 min |
| 2️⃣ | `02_setup_storage.sql` | Configurar bucket de archivos | 30 seg |
| 3️⃣ | `03_setup_functions.sql` | Funciones y triggers | 1 min |
| 4️⃣ | `04_setup_rls_policies.sql` | Políticas de seguridad (RLS) | 2 min |
| 5️⃣ | `05_setup_storage_policies.sql` | Políticas de archivos | 30 seg |
| 6️⃣ | `06_setup_seed_data.sql` | Datos iniciales (opcional) | 1 min |
| 7️⃣ | `07_setup_realtime.sql` | **Habilitar Realtime (CRÍTICO)** | 1 min |
| 📊 | `99_useful_queries.sql` | Queries útiles y mantenimiento | - |

### ✅ Verificar Instalación

Después de ejecutar los scripts, verifica que todo esté correcto:

```bash
# En Supabase SQL Editor, ejecutar:
/database/00_verify_installation.sql
```

El script mostrará un reporte completo del estado de la instalación. Si todo está bien verás:
```
🎉 ¡INSTALACIÓN COMPLETA Y CORRECTA!
✅ Todos los componentes están configurados correctamente.
```

---

## 🚨 ACCIÓN REQUERIDA: Sistema de Comentarios

**⚠️ Para que los comentarios eliminados dejen rastro (tipo WhatsApp):**

👉 **[`EJECUTAR_ESTO_AHORA.md`](./EJECUTAR_ESTO_AHORA.md)** ← Lee aquí primero

**SQL rápido:**
```sql
ALTER TABLE task_comments ADD COLUMN deleted_at timestamptz;
CREATE INDEX idx_task_comments_deleted_at ON task_comments(deleted_at);
```

📝 Ejecuta esto en SQL Editor de Supabase → Ver instrucciones en **[`INSTRUCCIONES_SOFT_DELETE.md`](./INSTRUCCIONES_SOFT_DELETE.md)**

---

## 🚨 ERROR COMÚN: "infinite recursion in policy"

Si ves este error al hacer login, **ejecuta el fix inmediatamente**:

👉 **[`FIX_LOGIN_ERROR.sql`](./FIX_LOGIN_ERROR.sql)** ← Ejecuta esto en SQL Editor

O lee la solución completa: **[`SOLUCION_ERROR_LOGIN.md`](./SOLUCION_ERROR_LOGIN.md)**

---

## 🚀 INICIO RÁPIDO

### ⚡ Setup Completo en 10 Minutos

**Opción A: Nueva Instalación (Recomendado)**

1. **Configura la base de datos**: Sigue [`/database/QUICK_START.md`](./database/QUICK_START.md)
2. **Crea los usuarios**: Usa las credenciales en la guía Quick Start
3. **Configura el proyecto**: Actualiza `/utils/supabase/info.tsx` con tus credenciales
4. **¡Inicia sesión!** Usa los botones de acceso rápido en la pantalla de login

**Opción B: Instalación Clásica (Legado)**

1. **Lee la guía completa**: [`SETUP_COMPLETO.md`](./SETUP_COMPLETO.md)
2. **Ejecuta el schema**: Copia `/supabase/schema.sql` al SQL Editor de Supabase
3. **Aplica el fix de RLS**: Ejecuta [`FIX_LOGIN_ERROR.sql`](./FIX_LOGIN_ERROR.sql)
4. **Crea los usuarios**: Sigue [`CREDENCIALES_USUARIOS.md`](./CREDENCIALES_USUARIOS.md)
5. **¡Inicia sesión!** Usa los botones de acceso rápido en la pantalla de login

### 🔐 Credenciales de Demo

| Rol | Email | Contraseña | Acceso |
|-----|-------|------------|--------|
| 🔴 **Admin** | admin@nexuspm.com | Admin123! | Completo |
| 🔵 **PM** | pm@nexuspm.com | ProductManager123! | Proyectos |
| 🟢 **Developer** | dev@nexuspm.com | Developer123! | Tareas |
| 🟣 **Advisor** | advisor@nexuspm.com | Advisor123! | Finanzas |

**💡 Tip**: Haz clic en los botones de colores en el login para ingresar automáticamente.

---

## 🚀 Características Principales

### Gestión de Proyectos
- ✅ CRUD completo de proyectos, clientes y tareas
- ✅ Kanban drag & drop para gestión visual de tareas
- ✅ Asignación de miembros del equipo a proyectos
- ✅ Seguimiento de estados y prioridades
- ✅ Comentarios y adjuntos en tareas

### Roles y Permisos
- **Admin**: Acceso total al sistema
- **Product Manager (PM)**: Gestión de proyectos, clientes, credenciales
- **Developer (Dev)**: Visualización de proyectos y gestión de tareas asignadas
- **Advisor**: Acceso a finanzas y reportes

### Gestión Financiera
- ✅ Registro de pagos recibidos
- ✅ Control de costos operativos
- ✅ Cobros recurrentes automatizados (mensual, trimestral, anual, personalizado)
- ✅ Dashboard financiero con métricas clave
- ✅ Reportes y gráficos de ingresos vs costos

### Temas y UI
- ✅ **Sistema de temas claro/oscuro** con toggle instantáneo
- ✅ **Tema oscuro estilo GitHub** con azul oscuro (#0d1117)
- ✅ Persistencia de preferencia en localStorage
- ✅ Detección automática de preferencia del sistema
- ✅ Transiciones suaves entre temas
- 📖 Ver detalles en **[SISTEMA_TEMAS.md](./SISTEMA_TEMAS.md)**

### Seguridad
- ✅ Autenticación con Supabase Auth
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Credenciales encriptadas con AES-256-GCM
- ✅ Visibilidad controlada por rol

### Funcionalidades Avanzadas
- ✅ Actualizaciones en tiempo real (Realtime Subscriptions)
- ✅ Notificaciones push en el navegador
- ✅ Panel de reportes y analytics
- ✅ Sistema de configuración de usuario
- ✅ Responsive design para mobile y desktop

## 🛠️ Stack Tecnológico

### Frontend
- **React 18.3.1** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite 6.3.5** - Build tool
- **Tailwind CSS 4.1** - Estilos
- **shadcn/ui** - Componentes UI
- **TanStack Query v5** - Gestión de estado servidor
- **Zustand 5.0** - Gestión de estado cliente
- **React Router 7** - Enrutamiento
- **React DnD** - Drag & drop para Kanban
- **Recharts** - Gráficos y visualizaciones
- **Zod 4.2** - Validación de esquemas
- **React Hook Form 7.55** - Manejo de formularios
- **date-fns 3.6** - Manipulación de fechas
- **SweetAlert2** - Modales de confirmación
- **Sonner** - Toast notifications

### Backend
- **Supabase** - Backend as a Service
  - **PostgreSQL** - Base de datos
  - **Supabase Auth** - Autenticación
  - **Row Level Security** - Seguridad a nivel de fila
  - **Realtime** - Actualizaciones en vivo
  - **Storage** - Almacenamiento de archivos
  - **Edge Functions (Deno)** - Funciones serverless
- **Hono** - Framework web para Edge Functions
- **Crypto API (Deno)** - Encriptación de credenciales

## 📋 Requisitos Previos

- Node.js 18+ (para desarrollo local)
- Cuenta de Supabase (gratuita)
- Git

## 🔧 Configuración Inicial

### 1. Configurar Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com)

2. En el SQL Editor de Supabase, ejecuta el script completo de `/supabase/schema.sql` para crear todas las tablas, políticas RLS, funciones y triggers.

3. Aplica el fix de RLS:
   - Ejecuta [`FIX_LOGIN_ERROR.sql`](./FIX_LOGIN_ERROR.sql) en el SQL Editor de Supabase

4. Crea tu primer usuario administrador:
   - Ve a Authentication → Users en Supabase
   - Crea un nuevo usuario con email y contraseña
   - Copia el UUID del usuario creado
   - En el SQL Editor, ejecuta:
   ```sql
   INSERT INTO users_profiles (id, email, full_name, role)
   VALUES (
     'uuid-del-usuario-creado',
     'admin@example.com',
     'Admin NexusPM',
     'admin'
   );
   ```

5. Obtén las credenciales de tu proyecto:
   - Ve a Project Settings → API
   - Copia el `Project URL` y `anon public` key
   - Actualiza `/utils/supabase/info.tsx` con tus credenciales

### 2. Configurar Variables de Entorno

El servidor Edge Function necesita estas variables de entorno en Supabase:

1. Ve a Project Settings → Edge Functions en Supabase
2. Agrega estas variables:

```
SUPABASE_URL=tu-project-url
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
ENCRYPTION_KEY=tu-clave-de-encriptacion-de-32-caracteres-minimo
```

**⚠️ IMPORTANTE**: 
- El `ENCRYPTION_KEY` debe ser una cadena de al menos 32 caracteres aleatorios
- El `SUPABASE_SERVICE_ROLE_KEY` **NUNCA** debe exponerse en el frontend
- Guarda estas claves de forma segura

### 3. Desplegar Edge Function

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login en Supabase
supabase login

# Link a tu proyecto
supabase link --project-ref tu-project-ref

# Desplegar la función
supabase functions deploy make-server-17d656ff
```

### 4. Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📂 Estructura del Proyecto

```
nexuspm/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── auth/           # Autenticación
│   │   │   ├── clients/        # Gestión de clientes
│   │   │   ├── credentials/    # Credenciales seguras
│   │   │   ├── dashboard/      # Dashboards por rol
│   │   │   ├── finances/       # Módulo financiero
│   │   │   ├── layout/         # Layout principal
│   │   │   ├── notifications/  # Panel de notificaciones
│   │   │   ├── projects/       # Gestión de proyectos
│   │   │   ├── reports/        # Reportes y analytics
│   │   │   ├── settings/       # Configuración
│   │   │   ├── tasks/          # Tareas y Kanban
│   │   │   ├── ui/             # Componentes shadcn/ui
│   │   │   └── users/          # Gestión de usuarios
│   │   └── App.tsx             # Componente raíz
│   ├── hooks/                  # Custom hooks
│   │   ├── useClients.ts
│   │   ├── useCredentials.ts
│   │   ├── useFinances.ts
│   │   ├── useProjects.ts
│   │   ├── useRealtime.ts      # Subscripciones realtime
│   │   ├── useTasks.ts
│   │   └── useUsers.ts
│   ├── lib/
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── utils.ts
│   │   └── validations.ts      # Esquemas Zod
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts
│   │   ├── projectStore.ts
│   │   ├── taskStore.ts
│   │   └── uiStore.ts
│   └── styles/                 # Estilos globales
├── supabase/
│   ├── functions/
│   │   └── server/
│   │       ├── auth.tsx        # Autenticación
│   │       ├── credentials.tsx # API credenciales
│   │       ├── encryption.tsx  # Encriptación
│   │       ├── finance.tsx     # API finanzas
│   │       ├── index.tsx       # Servidor Hono
│   │       └── kv_store.tsx    # KV store (protegido)
│   └── schema.sql              # Schema completo DB
├── utils/
│   └── supabase/
│       └── info.tsx            # Credenciales Supabase
└── package.json
```

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS configuradas:

- **Admin**: Acceso total a todas las tablas
- **PM**: Gestión de proyectos, clientes, tareas, credenciales
- **Dev**: Solo puede ver/editar tareas asignadas y proyectos donde es miembro
- **Advisor**: Acceso a finanzas y reportes

### Encriptación de Credenciales

Las credenciales se encriptan usando:
- **Algoritmo**: AES-256-GCM
- **Derivación de clave**: PBKDF2 con 100,000 iteraciones
- **Salt e IV aleatorios** por cada credencial
- Solo usuarios autorizados pueden desencriptar

## 🎯 Uso del Sistema

### Primer Inicio de Sesión

1. Accede a `/login`
2. Ingresa con el usuario admin creado
3. Navega por los diferentes módulos según tu rol

### Crear un Proyecto

1. Ve a **Proyectos** → Nuevo Proyecto
2. Selecciona un cliente (crea uno en **Clientes** si no existe)
3. Define nombre, descripción, fechas, URLs
4. Agrega miembros del equipo al proyecto

### Gestionar Tareas

1. Ve a **Mis Tareas**
2. Filtra por proyecto
3. Usa el Kanban para drag & drop entre estados
4. Asigna tareas a miembros del equipo
5. Agrega comentarios y adjuntos

### Control Financiero

1. Ve a **Finanzas** (solo Admin/Advisor)
2. Registra pagos recibidos
3. Configura cobros recurrentes
4. Visualiza métricas en el dashboard
5. Consulta reportes detallados

### Credenciales Seguras

1. Ve a **Credenciales** (Admin/PM)
2. Agrega credenciales de servicios del proyecto
3. Define si son visibles para developers
4. Las contraseñas se encriptan automáticamente

## 📊 Reportes Disponibles

- Tareas por estado (Pie Chart)
- Proyectos por estado (Bar Chart)
- Ingresos vs Costos mensuales (Line Chart)
- Productividad del equipo (Bar Chart)
- Ingresos por proyecto

## 🔔 Notificaciones en Tiempo Real

El sistema envía notificaciones automáticas para:
- Nuevas tareas asignadas
- Cambios de estado en tareas
- Nuevos comentarios
- Añadido a proyectos
- Nuevos pagos registrados

## 🌐 Realtime Subscriptions

Actualizaciones automáticas sin recargar la página para:
- Tareas (Kanban)
- Proyectos
- Clientes
- Pagos
- Usuarios

## 🐛 Debugging

### Logs del Backend

Los Edge Functions de Supabase loguean a la consola. Ver logs:

```bash
supabase functions logs make-server-17d656ff
```

### Problemas Comunes

**Error de autenticación**:
- Verifica que las credenciales en `utils/supabase/info.tsx` sean correctas
- Asegúrate de que el usuario tenga un perfil en `users_profiles`

**RLS bloquea consultas**:
- Verifica que el usuario tenga el rol correcto
- Revisa las políticas RLS en Supabase

**Credenciales no se desencriptan**:
- Verifica que `ENCRYPTION_KEY` esté configurado en variables de entorno
- La clave debe ser la misma que se usó para encriptar

## 🚀 Deploy a Producción

### Opción 1: Vercel (Recomendado para Frontend)

```bash
npm install -g vercel
vercel deploy
```

### Opción 2: Netlify

```bash
npm run build
# Sube la carpeta dist/ a Netlify
```

### Configuración en Producción

1. Actualiza las URLs en producción
2. Configura CORS en Supabase para permitir tu dominio
3. Verifica que todas las variables de entorno estén configuradas

## 📝 Licencia

Este proyecto es privado y de uso interno.

## 👥 Soporte

Para soporte, contacta al equipo de desarrollo o revisa la documentación de Supabase.

---

**NexusPM** - Gestión de proyectos profesional para equipos de desarrollo 🚀