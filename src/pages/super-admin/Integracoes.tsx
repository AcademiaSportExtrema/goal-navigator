import { AppLayout } from '@/components/layout/AppLayout';
import { IntegracoesTab } from '@/components/configuracao/IntegracoesTab';

export default function Integracoes() {
  return (
    <AppLayout title="Integrações" breadcrumbs={[{ label: 'Plataforma' }]}>
      <IntegracoesTab />
    </AppLayout>
  );
}
