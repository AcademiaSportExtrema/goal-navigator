

## Adicionar coluna "Cobrança Enviada" na tabela de devedores

### Problema
As consultoras precisam marcar se já enviaram a mensagem de cobrança para cada devedor. Atualmente não existe esse campo.

### Solução

**1. Migração de banco de dados**
- Adicionar coluna `cobranca_enviada` (boolean, default `false`) na tabela `devedores_parcelas`
- Adicionar RLS policy para que consultoras possam fazer UPDATE apenas neste campo nos registros que pertencem a elas

```sql
ALTER TABLE devedores_parcelas ADD COLUMN cobranca_enviada boolean NOT NULL DEFAULT false;
```

Nova policy de UPDATE para consultoras:
```sql
CREATE POLICY "Consultoras update cobranca own devedores"
ON devedores_parcelas FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND consultor IN (SELECT nome FROM consultoras WHERE id = get_user_consultora_id(auth.uid()))
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND consultor IN (SELECT nome FROM consultoras WHERE id = get_user_consultora_id(auth.uid()))
);
```

**2. Frontend (`src/pages/Devedores.tsx`)**
- Adicionar coluna "Cobrança" na tabela com um Checkbox/Switch
- Ao clicar, fazer UPDATE no banco: `supabase.from('devedores_parcelas').update({ cobranca_enviada: true/false }).eq('id', row.id)`
- Exibir visualmente o status (checkbox marcado = enviada)

### Detalhes técnicos
- Coluna boolean com default `false` garante que todos os registros existentes e novos comecem como "não enviado"
- A consultora pode marcar/desmarcar a qualquer momento
- Admins já têm permissão ALL, então também podem alterar
- O campo será resetado automaticamente quando um novo arquivo for importado (pois a Edge Function deleta tudo e reinsere)

