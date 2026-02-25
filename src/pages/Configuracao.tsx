import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, ShieldCheck, Sparkles, BrainCircuit } from 'lucide-react';
import { PermissoesTab } from '@/components/configuracao/PermissoesTab';
import ConsultorasContent from '@/components/configuracao/ConsultorasContent';
import { CoachDiretrizesTab } from '@/components/configuracao/CoachDiretrizesTab';
import { AnalistaIaConfigTab } from '@/components/configuracao/AnalistaIaConfigTab';

export default function Configuracao() {
  return (
    <AppLayout title="Configuração">
      <Tabs defaultValue="consultoras" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consultoras" className="gap-2">
            <Users className="h-4 w-4" />
            Consultoras
          </TabsTrigger>
          <TabsTrigger value="perm-admin" className="gap-2">
            <Shield className="h-4 w-4" />
            Perm. Admin
          </TabsTrigger>
          <TabsTrigger value="perm-consultora" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Perm. Consultora
          </TabsTrigger>
          <TabsTrigger value="coach-ia" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Coach IA
          </TabsTrigger>
          <TabsTrigger value="analista-ia" className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            Analista IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultoras">
          <ConsultorasContent />
        </TabsContent>

        <TabsContent value="perm-admin">
          <PermissoesTab targetRole="admin" />
        </TabsContent>

        <TabsContent value="perm-consultora">
          <PermissoesTab targetRole="consultora" />
        </TabsContent>

        <TabsContent value="coach-ia">
          <CoachDiretrizesTab />
        </TabsContent>

        <TabsContent value="analista-ia">
          <AnalistaIaConfigTab />
        </TabsContent>

      </Tabs>
    </AppLayout>
  );
}
