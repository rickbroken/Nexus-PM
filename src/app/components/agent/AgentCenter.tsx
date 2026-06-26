import { AlertTriangle, Bot, Clock3, ListChecks } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AgentActionsTable } from './AgentActionsTable';
import { AgentOperationalBrief } from './AgentOperationalBrief';
import { AgentRemindersPanel } from './AgentRemindersPanel';
import { useAgentActions, useRecentAgentActions } from '@/hooks/useAgentActions';
import { usePendingReminders, useReminders } from '@/hooks/useReminders';

export function AgentCenter() {
  const recentActionsQuery = useRecentAgentActions(10);
  const failedActionsQuery = useAgentActions({ status: 'failed', limit: 5 });
  const remindersQuery = useReminders({ limit: 20 });
  const pendingRemindersQuery = usePendingReminders({ limit: 5 });

  const recentActions = recentActionsQuery.data ?? [];
  const failedActions = failedActionsQuery.data ?? [];
  const reminders = remindersQuery.data ?? [];
  const pendingReminders = pendingRemindersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Center</h1>
          <p className="mt-1 text-zinc-600">
            Panel interno de monitoreo y auditoria para acciones ejecutadas por el backend MCP sobre Supabase.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones recientes</CardTitle>
            <Bot className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActions.length}</div>
            <CardDescription>Ultimas acciones auditadas del modulo interno.</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones fallidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedActions.length}</div>
            <CardDescription>Fallos recientes listos para auditoria y depuracion.</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recordatorios pendientes</CardTitle>
            <Clock3 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReminders.length}</div>
            <CardDescription>Alertas internas activas por atender.</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proximos recordatorios</CardTitle>
            <ListChecks className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reminders.length}</div>
            <CardDescription>Vista inicial de la cola interna de recordatorios.</CardDescription>
          </CardContent>
        </Card>
      </div>

      <AgentOperationalBrief />

      <Card>
        <CardHeader>
          <CardTitle>Resumen de acciones recientes</CardTitle>
          <CardDescription>
            Registro interno de acciones ejecutadas por el agente y herramientas MCP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentActionsTable actions={recentActions} isLoading={recentActionsQuery.isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones fallidas</CardTitle>
          <CardDescription>
            Errores recientes del modulo interno para diagnostico y trazabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentActionsTable actions={failedActions} isLoading={failedActionsQuery.isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recordatorios internos</CardTitle>
          <CardDescription>
            Historial interno de recordatorios registrados por el sistema y herramientas MCP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentRemindersPanel reminders={reminders} isLoading={remindersQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
