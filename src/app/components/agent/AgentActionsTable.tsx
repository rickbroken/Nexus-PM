import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import type { AgentAction } from '@/lib/supabase';

interface AgentActionsTableProps {
  actions: AgentAction[];
  isLoading?: boolean;
}

function getStatusVariant(status: AgentAction['status']) {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'destructive';
    default:
      return 'warning';
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CO');
}

function getEntityLabel(action: AgentAction) {
  if (action.project?.name) return `Proyecto: ${action.project.name}`;
  if (action.task?.title) return `Tarea: ${action.task.title}`;
  if (action.client?.name) return `Cliente: ${action.client.name}`;
  if (action.payment_id) return 'Pago';
  if (action.recurring_charge_id) return 'Cobro recurrente';
  if (action.entity_type) return action.entity_type;
  return 'Sin entidad';
}

export function AgentActionsTable({ actions, isLoading }: AgentActionsTableProps) {
  if (isLoading) {
    return <p className="text-sm text-zinc-500">Cargando acciones...</p>;
  }

  if (actions.length === 0) {
    return <p className="text-sm text-zinc-500">No hay acciones registradas todavia.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo de accion</TableHead>
          <TableHead>Entidad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actions.map((action) => (
          <TableRow key={action.id}>
            <TableCell>{formatDate(action.created_at)}</TableCell>
            <TableCell className="font-medium">{action.action_type}</TableCell>
            <TableCell>{getEntityLabel(action)}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(action.status)}>{action.status}</Badge>
            </TableCell>
            <TableCell>{action.user?.full_name || 'Sistema'}</TableCell>
            <TableCell className="max-w-[280px] whitespace-normal text-xs text-zinc-600">
              {action.error_message || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
