# 🗄️ NexusPM - Configuración de Base de Datos Supabase

Este directorio contiene todos los scripts SQL necesarios para configurar la base de datos de NexusPM desde cero.

## 📋 Requisitos Previos

1. **Cuenta de Supabase**: Crear un proyecto en [supabase.com](https://supabase.com)
2. **Acceso al SQL Editor**: Dashboard de Supabase > SQL Editor
3. **Variables de entorno**: Tener a mano el `Project ID` y las API keys

## 🚀 Orden de Ejecución

Los scripts deben ejecutarse en el **orden numérico** indicado en sus nombres. Cada script es independiente y puede ejecutarse múltiples veces de forma segura (idempotente).

### **Paso 1: Crear Tablas**
📄 Archivo: `01_setup_tables.sql`

Este script crea todas las tablas principales del sistema:
- `users_profiles` - Perfiles de usuarios
- `clients` - Clientes
- `projects` - Proyectos
- `project_members` - Miembros de proyectos
- `project_credentials` - Credenciales de servicios
- `tasks` - Tareas
- `task_comments` - Comentarios de tareas
- `task_attachments` - Adjuntos de tareas
- `project_finances` - Información financiera
- `payments` - Pagos/ingresos/egresos
- `recurring_charges` - Cobros recurrentes
- `payment_methods` - Métodos de pago
- `notifications` - Notificaciones del sistema
- `kv_store_17d656ff` - Almacén clave-valor

**Cómo ejecutar:**
1. Ir a Supabase Dashboard > SQL Editor
2. Click en "New Query"
3. Copiar y pegar todo el contenido de `01_setup_tables.sql`
4. Click en "Run"

---

### **Paso 2: Configurar Storage**
📄 Archivo: `02_setup_storage.sql`

Este script crea el bucket de almacenamiento para archivos adjuntos de tareas.

**Cómo ejecutar:**
1. En el SQL Editor, nueva query
2. Copiar y pegar `02_setup_storage.sql`
3. Click en "Run"

---

### **Paso 3: Crear Funciones y Triggers**
📄 Archivo: `03_setup_functions.sql`

Este script crea:
- Función `update_updated_at_column()` - Actualiza automáticamente timestamps
- Triggers para todas las tablas con `updated_at`
- Función `handle_new_user()` - Crea perfiles automáticamente al registrar usuarios
- Función `auto_archive_completed_tasks()` - Archiva tareas completadas

**Cómo ejecutar:**
1. Nueva query en SQL Editor
2. Copiar y pegar `03_setup_functions.sql`
3. Click en "Run"

---

### **Paso 4: Configurar Políticas RLS**
📄 Archivo: `04_setup_rls_policies.sql`

Este script configura Row Level Security (RLS) para proteger los datos según el rol del usuario.

**Roles del sistema:**
- `admin` - Acceso completo
- `pm` (Product Manager) - Gestión de proyectos, clientes, tareas
- `dev` (Developer) - Tareas asignadas y proyectos
- `advisor` - Finanzas y reportes

**Cómo ejecutar:**
1. Nueva query en SQL Editor
2. Copiar y pegar `04_setup_rls_policies.sql`
3. Click en "Run"

---

### **Paso 5: Configurar Políticas de Storage**
📄 Archivo: `05_setup_storage_policies.sql`

Este script configura las políticas de acceso para el bucket de archivos adjuntos.

**Cómo ejecutar:**
1. Nueva query en SQL Editor
2. Copiar y pegar `05_setup_storage_policies.sql`
3. Click en "Run"

---

### **Paso 6: Insertar Datos Iniciales (OPCIONAL)**
📄 Archivo: `06_setup_seed_data.sql`

Este script inserta datos de prueba y configuración inicial.

**⚠️ IMPORTANTE:** Antes de ejecutar este script, debes crear manualmente los usuarios de prueba en Supabase Auth.

**Crear usuarios de prueba:**

1. Ir a Supabase Dashboard > Authentication > Users
2. Click en "Add User" > "Create new user"
3. Crear los siguientes usuarios:

   **Admin:**
   - Email: `admin@nexuspm.com`
   - Password: `Admin123!`
   - Confirm Password: `Admin123!`
   - Auto Confirm User: ✅ (activar)
   - User Metadata (JSON):
     ```json
     {
       "full_name": "Admin User",
       "role": "admin"
     }
     ```

   **Product Manager:**
   - Email: `pm@nexuspm.com`
   - Password: `ProductManager123!`
   - Auto Confirm User: ✅
   - User Metadata:
     ```json
     {
       "full_name": "Product Manager",
       "role": "pm"
     }
     ```

   **Developer:**
   - Email: `dev@nexuspm.com`
   - Password: `Developer123!`
   - Auto Confirm User: ✅
   - User Metadata:
     ```json
     {
       "full_name": "Developer User",
       "role": "dev"
     }
     ```

   **Advisor:**
   - Email: `advisor@nexuspm.com`
   - Password: `Advisor123!`
   - Auto Confirm User: ✅
   - User Metadata:
     ```json
     {
       "full_name": "Financial Advisor",
       "role": "advisor"
     }
     ```

4. Una vez creados los usuarios, ejecutar `06_setup_seed_data.sql`:
   - Nueva query en SQL Editor
   - Copiar y pegar `06_setup_seed_data.sql`
   - Click en "Run"

---

### **Paso 7: Habilitar Realtime**
📄 Archivo: `07_setup_realtime.sql`

Este script habilita las actualizaciones en tiempo real (Realtime Subscriptions) para que los cambios en la base de datos se reflejen automáticamente en el frontend sin necesidad de recargar la página.

**Qué hace:**
- Habilita `REPLICA IDENTITY FULL` en todas las tablas
- Agrega las tablas a la publicación `supabase_realtime`
- Verifica que Realtime esté configurado correctamente

**Cómo ejecutar:**
1. Nueva query en SQL Editor
2. Copiar y pegar `07_setup_realtime.sql`
3. Click en "Run"
4. Verificar el mensaje de éxito en los logs

**⚠️ IMPORTANTE:** Sin este script, las actualizaciones en tiempo real NO funcionarán y los usuarios tendrán que recargar la página manualmente para ver cambios.

---

## 🔐 Configurar Variables de Entorno

Después de ejecutar todos los scripts, necesitas configurar las variables de entorno en tu proyecto:

1. **Obtener credenciales de Supabase:**
   - Ir a Supabase Dashboard > Settings > API
   - Copiar `Project URL` (ejemplo: `https://abcdefg.supabase.co`)
   - Copiar `anon/public` key
   - Ir a Settings > Database > Connection string > URI y copiar la contraseña

2. **Configurar en el proyecto:**
   - Crear/editar archivo `/utils/supabase/info.tsx`
   - Agregar:
     ```typescript
     export const projectId = 'tu-project-id'; // Solo el ID, sin .supabase.co
     export const publicAnonKey = 'tu-anon-key';
     ```

---

## ✅ Verificar la Instalación

Para verificar que todo se configuró correctamente:

1. **Verificar tablas creadas:**
   - Ir a Supabase Dashboard > Table Editor
   - Deberías ver todas las 14 tablas listadas

2. **Verificar Storage:**
   - Ir a Storage
   - Debería existir el bucket `task-attachments`

3. **Verificar usuarios:**
   - Ir a Authentication > Users
   - Deberías ver los 4 usuarios de prueba

4. **Probar login:**
   - Iniciar la aplicación web
   - Intentar hacer login con cualquier usuario de prueba
   - Ejemplo: `pm@nexuspm.com` / `ProductManager123!`

---

## 🔄 Reiniciar la Base de Datos

Si necesitas reiniciar completamente la base de datos:

⚠️ **ADVERTENCIA:** Esto eliminará TODOS los datos.

```sql
-- Ejecutar en este orden:

-- 1. Eliminar todas las políticas RLS
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users_profiles;
-- ... (ejecutar todos los DROP POLICY de 04_setup_rls_policies.sql)

-- 2. Eliminar funciones y triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.auto_archive_completed_tasks();

-- 3. Eliminar tablas (en orden inverso por dependencias)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.task_attachments CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.recurring_charges CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.project_finances CASCADE;
DROP TABLE IF EXISTS public.project_credentials CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.kv_store_17d656ff CASCADE;
DROP TABLE IF EXISTS public.users_profiles CASCADE;

-- 4. Eliminar bucket de storage
DELETE FROM storage.buckets WHERE id = 'task-attachments';

-- 5. Luego volver a ejecutar todos los scripts en orden
```

---

## 📞 Soporte

Si encuentras problemas durante la configuración:

1. Verifica que todos los scripts se ejecutaron sin errores
2. Revisa los logs del SQL Editor para mensajes de error
3. Asegúrate de que las políticas RLS estén habilitadas
4. Verifica que los usuarios se crearon correctamente en Auth

---

## 📝 Notas Adicionales

- **Backups**: Supabase realiza backups automáticos. Configura backups adicionales en Settings > Database > Backups
- **Migraciones**: Para cambios futuros en el esquema, crea nuevos archivos SQL numerados secuencialmente
- **Seguridad**: Nunca compartas tus API keys. Usa variables de entorno en producción
- **Rendimiento**: Los índices ya están creados en las columnas más consultadas

---

¡Listo! 🎉 Tu base de datos NexusPM está configurada y lista para usar.