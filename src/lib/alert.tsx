import { createRoot } from 'react-dom/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

interface AlertOptions {
  title: string;
  text?: string;
  icon?: AlertType;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}

interface AlertResult {
  isConfirmed: boolean;
  isDismissed: boolean;
}

const iconMap = {
  success: <CheckCircle2 className="size-6 text-green-600" />,
  error: <XCircle className="size-6 text-red-600" />,
  warning: <AlertTriangle className="size-6 text-amber-600" />,
  info: <Info className="size-6 text-blue-600" />,
  question: <AlertTriangle className="size-6 text-blue-600" />,
};

function AlertComponent({
  title,
  text,
  icon,
  confirmButtonText = 'Aceptar',
  cancelButtonText = 'Cancelar',
  showCancelButton = false,
  onConfirm,
  onCancel,
}: AlertOptions & {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {icon && iconMap[icon]}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          {text && <AlertDialogDescription>{text}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {showCancelButton && (
            <AlertDialogCancel onClick={onCancel}>
              {cancelButtonText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={onConfirm}>
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const Alert = {
  fire: (options: AlertOptions): Promise<AlertResult> => {
    return new Promise((resolve) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      const cleanup = () => {
        root.unmount();
        document.body.removeChild(container);
      };

      const handleConfirm = () => {
        cleanup();
        resolve({ isConfirmed: true, isDismissed: false });
      };

      const handleCancel = () => {
        cleanup();
        resolve({ isConfirmed: false, isDismissed: true });
      };

      root.render(
        <AlertComponent
          {...options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
    });
  },

  // Helper methods para uso más simple
  success: (title: string, text?: string) => {
    return Alert.fire({ title, text, icon: 'success' });
  },

  error: (title: string, text?: string) => {
    return Alert.fire({ title, text, icon: 'error' });
  },

  warning: (title: string, text?: string) => {
    return Alert.fire({ title, text, icon: 'warning' });
  },

  info: (title: string, text?: string) => {
    return Alert.fire({ title, text, icon: 'info' });
  },

  confirm: (title: string, text?: string) => {
    return Alert.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });
  },
};

// Alias para compatibilidad con código existente
export default Alert;