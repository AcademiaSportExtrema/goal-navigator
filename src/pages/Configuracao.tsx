import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, ShieldCheck } from 'lucide-react';
import { PermissoesTab } from '@/components/configuracao/PermissoesTab';
import ConsultorasContent from '@/components/configuracao/ConsultorasContent';

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

      </Tabs>
    </AppLayout>
  );
}
