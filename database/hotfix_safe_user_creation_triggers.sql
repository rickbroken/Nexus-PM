-- =====================================================
-- HOTFIX: creación segura de usuarios desde Auth
-- =====================================================
-- Evita que errores secundarios en triggers de perfiles/notificaciones
-- aborten auth.admin.createUser() con "Database error creating new user".
-- La Edge Function server/users/create sigue haciendo el upsert final
-- del perfil con service_role y rollback del Auth user si algo falla.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    requested_role TEXT;
BEGIN
    requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dev');

    IF requested_role NOT IN ('admin', 'pm', 'dev', 'advisor') THEN
        requested_role := 'dev';
    END IF;

    INSERT INTO public.users_profiles (id, email, full_name, role, avatar_url, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email),
        requested_role,
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        avatar_url = EXCLUDED.avatar_url,
        is_active = true;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user skipped for auth user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_user_registered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        action_url,
        created_by
    )
    SELECT
        id,
        'user_registered',
        'Nuevo usuario registrado',
        NEW.full_name || ' (' || NEW.role || ') se ha registrado en el sistema',
        'user',
        NEW.id::text,
        '/settings',
        NEW.id
    FROM public.users_profiles
    WHERE role = 'admin';

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'notify_user_registered skipped for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;
