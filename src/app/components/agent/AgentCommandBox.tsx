import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, HelpCircle, Sparkles, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import {
  useAgentCommand,
  type AgentCommandData,
  type AgentCommandOption,
  type AgentCommandResult,
} from '@/hooks/useAgentCommand';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const EXAMPLE_COMMANDS = [
  'envía la tarea login a revisión',
  'crear tarea urgente en TargerMats arreglar login',
  'posponer recordatorio de pagos para mañana',
  'resumen de hoy',
];

function DataListSection({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-4">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {hasItems ? <div className="space-y-2">{children}</div> : <p className="text-sm text-zinc-500">{emptyText}</p>}
    </div>
  );
}

function QueryResultBlocks({ data }: { data: AgentCommandData }) {
  return (
    <div className="space-y-3">
      {data.pendingTasks ? (
        <DataListSection title="Tareas pendientes" emptyText="Sin tareas pendientes.">
          {data.pendingTasks.map((task) => (
            <div key={task.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{task.title}</p>
              <p className="text-xs text-zinc-500">
                {task.status}
                {task.priority ? ` · ${task.priority}` : ''}
                {task.projectName ? ` · ${task.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}

      {data.overdueTasks ? (
        <DataListSection title="Tareas vencidas" emptyText="Sin tareas vencidas.">
          {data.overdueTasks.map((task) => (
            <div key={task.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{task.title}</p>
              <p className="text-xs text-zinc-500">
                {task.status}
                {task.priority ? ` · ${task.priority}` : ''}
                {task.projectName ? ` · ${task.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}

      {data.upcomingReminders ? (
        <DataListSection title="Recordatorios próximos" emptyText="Sin recordatorios próximos.">
          {data.upcomingReminders.map((reminder) => (
            <div key={reminder.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{reminder.title}</p>
              <p className="text-xs text-zinc-500">
                {formatDateTime(reminder.remindAt)}
                {reminder.priority ? ` · ${reminder.priority}` : ''}
                {reminder.projectName ? ` · ${reminder.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}

      {data.pendingPayments ? (
        <DataListSection title="Pagos pendientes" emptyText="Sin pagos pendientes.">
          {data.pendingPayments.map((payment) => (
            <div key={payment.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{formatCurrency(payment.amount)}</p>
              <p className="text-xs text-zinc-500">
                {formatDate(payment.paymentDate)}
                {payment.projectName ? ` · ${payment.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}

      {data.overduePayments ? (
        <DataListSection title="Pagos vencidos" emptyText="Sin pagos vencidos.">
          {data.overduePayments.map((payment) => (
            <div key={payment.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{formatCurrency(payment.amount)}</p>
              <p className="text-xs text-zinc-500">
                {formatDate(payment.paymentDate)}
                {payment.projectName ? ` · ${payment.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}

      {data.upcomingRecurringCharges ? (
        <DataListSection title="Cobros próximos" emptyText="Sin cobros próximos.">
          {data.upcomingRecurringCharges.map((charge) => (
            <div key={charge.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{charge.description}</p>
              <p className="text-xs text-zinc-500">
                {formatCurrency(charge.amount)} · {formatDate(charge.nextDueDate)}
                {charge.projectName ? ` · ${charge.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}

      {data.overdueRecurringCharges ? (
        <DataListSection title="Cobros vencidos" emptyText="Sin cobros vencidos.">
          {data.overdueRecurringCharges.map((charge) => (
            <div key={charge.id} className="rounded-md border border-zinc-200 px-3 py-2">
              <p className="text-sm font-medium text-zinc-900">{charge.description}</p>
              <p className="text-xs text-zinc-500">
                {formatCurrency(charge.amount)} · {formatDate(charge.nextDueDate)}
                {charge.projectName ? ` · ${charge.projectName}` : ''}
              </p>
            </div>
          ))}
        </DataListSection>
      ) : null}
    </div>
  );
}

function ResultAlert({ result }: { result: AgentCommandResult }) {
  if (result.status === 'success') {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-900">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Resultado</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  }

  if (result.status === 'ambiguity') {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>Se necesita una selección</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  }

  if (result.status === 'unsupported') {
    return (
      <Alert className="border-blue-200 bg-blue-50 text-blue-900">
        <Bot className="h-4 w-4" />
        <AlertTitle>Comando no soportado</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{result.message}</AlertDescription>
    </Alert>
  );
}

export function AgentCommandBox() {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState<AgentCommandResult | null>(null);
  const { executeCommand, resolveOption, isPending } = useAgentCommand();

  const activeOptionKey = useMemo(() => {
    return resolveOption.variables?.option.key ?? null;
  }, [resolveOption.variables]);

  const handleExecute = async () => {
    const response = await executeCommand.mutateAsync({ command });
    setResult(response);
  };

  const handleResolveOption = async (option: AgentCommandOption) => {
    const response = await resolveOption.mutateAsync({
      command,
      option,
    });
    setResult(response);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-zinc-700" />
          <CardTitle>Caja de comandos</CardTitle>
        </div>
        <CardDescription>
          Ejecuta acciones internas con reglas simples mientras preparamos Nexus-PM para futuras herramientas MCP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Escribe un comando como: recuérdame revisar pagos mañana"
            className="min-h-24"
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_COMMANDS.map((example) => (
              <Badge
                key={example}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  if (!isPending) {
                    setCommand(example);
                  }
                }}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleExecute} disabled={isPending || !command.trim()}>
            {executeCommand.isPending ? 'Ejecutando...' : 'Ejecutar'}
          </Button>
          <p className="text-sm text-zinc-500">
            Soporta recordatorios, crear tarea y poner tareas en progreso.
          </p>
        </div>

        {result ? <ResultAlert result={result} /> : null}

        {result?.status === 'success' && result.data ? <QueryResultBlocks data={result.data} /> : null}

        {result?.status === 'ambiguity' && result.options?.length ? (
          <div className="space-y-2 rounded-lg border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-900">Opciones disponibles</p>
            <div className="space-y-2">
              {result.options.map((option) => (
                <div
                  key={option.key}
                  className="flex flex-col gap-2 rounded-md border border-zinc-200 px-3 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{option.label}</p>
                    {option.description ? (
                      <p className="text-sm text-zinc-500">{option.description}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={resolveOption.isPending}
                    onClick={() => handleResolveOption(option)}
                  >
                    {activeOptionKey === option.key && resolveOption.isPending
                      ? 'Resolviendo...'
                      : 'Seleccionar'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
