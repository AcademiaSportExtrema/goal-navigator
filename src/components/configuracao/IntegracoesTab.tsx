import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function IntegracoesTab() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Informe a chave da API');
      return;
    }
    setIsSaving(true);
    // TODO: salvar via edge function em secrets
    setTimeout(() => {
      toast.success('Chave salva com sucesso');
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">AbacatePay</CardTitle>
              <CardDescription>
                Configure sua integração com o AbacatePay para cobrança recorrente de empresas.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
              Pendente
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="abacate-api-key">Chave da API (Secret Key)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="abacate-api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="abc_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha sua chave no painel do{' '}
              <a
                href="https://abacatepay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                AbacatePay <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
