# ⚡ NexusPM - Guía de Inicio Rápido

Esta guía te ayudará a configurar NexusPM en **menos de 10 minutos**.

## 📋 Pre-requisitos

- ✅ Proyecto creado en [Supabase](https://supabase.com)
- ✅ Acceso al SQL Editor de Supabase

## 🚀 Instalación en 5 Pasos

### **Paso 1: Crear Tablas** ⏱️ ~2 min

1. Abre Supabase Dashboard → **SQL Editor**
2. Click en **"New Query"**
3. Copia y pega **TODO** el contenido de `01_setup_tables.sql`
4. Click en **"Run"** ▶️
5. Espera el mensaje de éxito ✅

---

### **Paso 2: Configurar Storage** ⏱️ ~30 seg

1. Nueva query en SQL Editor
2. Copia y pega `02_setup_storage.sql`
3. Click en **"Run"** ▶️

---

### **Paso 3: Crear Funciones** ⏱️ ~1 min

1. Nueva query
2. Copia y pega `03_setup_functions.sql`
3. Click en **"Run"** ▶️

---

### **Paso 4: Configurar Seguridad (RLS)** ⏱️ ~2 min

1. Nueva query
2. Copia y pega `04_setup_rls_policies.sql`
3. Click en **"Run"** ▶️
4. Nueva query
5. Copia y pega `05_setup_storage_policies.sql`
6. Click en **"Run"** ▶️

---

### **Paso 5: Crear Usuarios y Datos** ⏱️ ~4 min

#### 5A. Crear usuarios de prueba en Supabase Auth

Ir a: **Authentication → Users → Add User → Create new user**

Crear estos 4 usuarios:

**1️⃣ Admin**
```
Email: admin@nexuspm.com
Password: Admin123!
Auto Confirm: ✅ Activar
User Metadata (JSON):
{
  "full_name": "Admin User",
  "role": "admin"
}
```

**2️⃣ Product Manager**
```
Email: pm@nexuspm.com
Password: ProductManager123!
Auto Confirm: ✅ Activar
User Metadata (JSON):
{
  "full_name": "Product Manager",
  "role": "pm"
}
```

**3️⃣ Developer**
```
Email: dev@nexuspm.com
Password: Developer123!
Auto Confirm: ✅ Activar
User Metadata (JSON):
{
  "full_name": "Developer User",
  "role": "dev"
}
```

**4️⃣ Advisor**
```
Email: advisor@nexuspm.com
Password: Advisor123!
Auto Confirm: ✅ Activar
User Metadata (JSON):
{
  "full_name": "Financial Advisor",
  "role": "advisor"
}
```

#### 5B. Insertar datos iniciales

1. Volver al SQL Editor
2. Nueva query
3. Copia y pega `06_setup_seed_data.sql`
4. Click en **"Run"** ▶️

---

### **Paso 6: Habilitar Realtime** ⏱️ ~1 min

**⚠️ CRÍTICO:** Sin este paso, las actualizaciones en tiempo real NO funcionarán.

1. Nueva query en SQL Editor
2. Copia y pega `07_setup_realtime.sql`
3. Click en **"Run"** ▶️
4. Verifica el mensaje: **"✅ REALTIME CONFIGURADO CORRECTAMENTE"**

**¿Qué hace Realtime?**
- Actualiza el Kanban automáticamente cuando alguien mueve una tarea
- Muestra nuevos comentarios sin recargar
- Sincroniza cambios entre múltiples usuarios en tiempo real

---

## ✅ Verificar Instalación

Ejecuta el script de verificación:

1. SQL Editor → Nueva query
2. Copia y pega `00_verify_installation.sql`
3. Click en **"Run"** ▶️
4. Lee los mensajes en la consola

**Si todo está correcto verás:**
```
🎉 ¡INSTALACIÓN COMPLETA Y CORRECTA!
✅ Todos los componentes están configurados correctamente.
```

---

## 🔑 Configurar Aplicación

### Obtener credenciales

1. Ir a: **Settings → API**
2. Copiar:
   - **Project URL** (ejemplo: `https://abcdefghijk.supabase.co`)
   - **anon/public key**

### Configurar en el proyecto

Editar archivo `/utils/supabase/info.tsx`:

```typescript
export const projectId = 'abcdefghijk'; // Solo el ID (sin .supabase.co)
export const publicAnonKey = 'tu-anon-key-aqui';
```

---

## 🎯 Probar la Aplicación

1. Iniciar la aplicación: `npm run dev`
2. Abrir navegador en `http://localhost:5173` (o el puerto configurado)
3. Hacer clic en cualquier botón de acceso rápido:
   - **Admin** → admin@nexuspm.com / Admin123!
   - **PM** → pm@nexuspm.com / ProductManager123!
   - **Developer** → dev@nexuspm.com / Developer123!
   - **Advisor** → advisor@nexuspm.com / Advisor123!

---

## 🛠️ Archivos Disponibles

| Archivo | Descripción | Tiempo |
|---------|-------------|--------|
| `00_verify_installation.sql` | Verificar que todo esté bien | 30 seg |
| `01_setup_tables.sql` | Crear todas las tablas | 2 min |
| `02_setup_storage.sql` | Configurar almacenamiento | 30 seg |
| `03_setup_functions.sql` | Funciones y triggers | 1 min |
| `04_setup_rls_policies.sql` | Políticas de seguridad | 2 min |
| `05_setup_storage_policies.sql` | Seguridad de archivos | 30 seg |
| `06_setup_seed_data.sql` | Datos iniciales | 1 min |
| `07_setup_realtime.sql` | Habilitar Realtime | 1 min |
| `99_useful_queries.sql` | Queries útiles (opcional) | - |

---

## ❓ Troubleshooting

### Error: "relation already exists"
- ✅ **Solución:** Ya está creada, continuar con el siguiente script

### Error: "permission denied"
- ❌ **Problema:** Usuario no tiene permisos
- ✅ **Solución:** Usar el usuario de servicio o verificar rol

### Error: "function does not exist"
- ❌ **Problema:** Script 03 no se ejecutó
- ✅ **Solución:** Ejecutar `03_setup_functions.sql`

### Los usuarios no se crean automáticamente
- ❌ **Problema:** Trigger no está activo
- ✅ **Solución:** Verificar que `03_setup_functions.sql` se ejecutó correctamente

### No puedo hacer login
- ❌ **Problema:** Usuarios no confirmados
- ✅ **Solución:** En Auth → Users, verificar que "Email Confirmed" esté en ✅

---

## 📞 Soporte

Si tienes problemas:

1. ✅ Ejecuta `00_verify_installation.sql` para diagnosticar
2. ✅ Revisa los mensajes de error en el SQL Editor
3. ✅ Verifica que los usuarios estén confirmados en Auth
4. ✅ Consulta `99_useful_queries.sql` para queries de debugging

---

## 🎉 ¡Listo!

Tu instalación de NexusPM está completa. Ahora puedes:

- ✅ Crear proyectos
- ✅ Asignar tareas
- ✅ Gestionar finanzas
- ✅ Colaborar con tu equipo

**¡Bienvenido a NexusPM!** 🚀