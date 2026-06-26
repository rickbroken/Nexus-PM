CREATE OR REPLACE FUNCTION public.notify_payment()
RETURNS TRIGGER AS $$
DECLARE
    project_info RECORD;
    payment_amount NUMERIC;
    large_payment_threshold NUMERIC := 5000;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'paid' THEN
        SELECT
            p.id,
            p.name AS project_name
        INTO project_info
        FROM projects p
        WHERE p.id = NEW.project_id;

        payment_amount := ABS(NEW.amount);

        IF NEW.type = 'income' THEN
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
                'payment_received',
                'Pago recibido',
                'Pago de $' || TO_CHAR(payment_amount, 'FM999,999,999.00') ||
                ' registrado en: ' || COALESCE(project_info.project_name, 'Proyecto'),
                'payment',
                NEW.id::text,
                '/finances',
                NEW.created_by
            FROM public.users_profiles
            WHERE role = 'advisor' AND is_active = true;

            IF payment_amount >= large_payment_threshold THEN
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
                    'payment_large',
                    '💰 Pago importante recibido',
                    'Pago de $' || TO_CHAR(payment_amount, 'FM999,999,999.00') ||
                    ' en: ' || COALESCE(project_info.project_name, 'Proyecto'),
                    'payment',
                    NEW.id::text,
                    '/finances',
                    NEW.created_by
                FROM public.users_profiles
                WHERE role = 'advisor' AND is_active = true;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
