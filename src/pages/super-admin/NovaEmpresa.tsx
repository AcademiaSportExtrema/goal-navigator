import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function NovaEmpresa() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    slug: '',
    email_admin: '',
    senha_admin: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.slug || !form.email_admin || !form.senha_admin) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (form.senha_admin.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-empresa', {
        body: {
          nome: form.nome,
          slug: form.slug,
          email_admin: form.email_admin,
          senha_admin: form.senha_admin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Empresa criada com sucesso!');
      navigate('/super-admin/empresas');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout title="Nova Empresa">
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/super-admin/empresas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Empresa</h1>
            <p className="text-muted-foreground">Cadastre uma nova empresa na plataforma</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Um usuário administrador será criado automaticamente para a empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Empresa</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Academia Fitness"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador)</Label>
                  <Input
                    id="slug"
                    placeholder="Ex: academia-fitness"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email do Admin</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={form.email_admin}
                    onChange={(e) => setForm({ ...form, email_admin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha Inicial</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.senha_admin}
                    onChange={(e) => setForm({ ...form, senha_admin: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar Empresa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
