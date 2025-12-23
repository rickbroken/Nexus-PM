import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { PaymentsList } from './PaymentsList';
import { RecurringChargesList } from './RecurringChargesList';
import { PaymentMethodsList } from './PaymentMethodsList';
import { FinancialSummary } from './FinancialSummary';

export function FinancesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Finanzas</h1>
      </div>

      <FinancialSummary />

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments" className="mx-[10px] my-[0px]">Pagos</TabsTrigger>
          <TabsTrigger value="recurring" className="mx-[10px] my-[0px]">Cobros Recurrentes</TabsTrigger>
          <TabsTrigger value="methods" className="mx-[10px] my-[0px]">Métodos de Pago</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <PaymentsList />
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringChargesList />
        </TabsContent>

        <TabsContent value="methods">
          <PaymentMethodsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}