
Diagnóstico confirmado

- O login da Lívia está autenticando corretamente no backend (requisição de token retorna 200).
- O problema é de fluxo no frontend após autenticar: o app fica sem avançar porque o estado de autenticação/perfil não “fecha” de forma confiável.
- Do I know what the issue is? Sim.
- Causa raiz mais provável no código atual: `useAuth.tsx` executa chamada assíncrona ao banco (`fetchUserData`) dentro de `onAuthStateChange` com `await`. Esse padrão pode travar o fluxo de sessão e impedir redirecionamento consistente (efeito clássico: botão “Entrando...” / tela sem avanço).

Plano de correção

1) Refatorar `src/hooks/useAuth.tsx` para remover `await` e chamadas ao banco dentro de `onAuthStateChange`
- Deixar o callback de `onAuthStateChange` apenas para sincronizar `session`/`user`.
- Mover carregamento de perfil/role (`user_roles`, `empresas`) para um `useEffect` separado, disparado por `user?.id`.

2) Blindar carregamento de perfil
- Envolver `fetchUserData` com `try/catch/finally`.
- Garantir `setIsLoading(false)` em todos os cenários (sucesso, erro, ausência de role).
- Resetar estado (`role`, `consultoraId`, `empresaId`, etc.) quando falhar leitura de perfil para evitar estado inconsistente.

3) Ajustar robustez de consulta de role
- Trocar `.single()` por leitura mais tolerante (ex.: `limit(1)` + tratamento explícito de erro), para evitar quebra se houver inconsistência de dados.

4) Manter `Login.tsx` sem `navigate('/dashboard')` hardcoded
- O redirecionamento continua centralizado no `useEffect` do login, mas agora com contexto de auth estável ele volta a funcionar corretamente.

Validação (obrigatória)

- Testar fim a fim com a conta da Lívia:
  - login -> redirecionamento esperado (consultora).
  - recarregar página já logada.
  - logout e novo login.
- Testar com admin para garantir que não houve regressão de redirecionamento/permissão.
- Validar que não há mais caso de “não retorna nada” após clicar Entrar.

Detalhes técnicos

- Arquivos alvo:
  - `src/hooks/useAuth.tsx` (principal)
  - `src/pages/Login.tsx` (confirmar apenas fluxo de redirect via efeito)
- Resultado esperado:
  - autenticação continua 200
  - carregamento de perfil conclui sempre
  - navegação pós-login previsível para consultora/admin

<lov-actions>
<lov-suggestion message="Teste o login fim a fim da Lívia e do admin (entrar, redirecionar, recarregar, sair e entrar novamente) para validar que o fluxo ficou estável.">Verificar fluxo completo</lov-suggestion>
<lov-suggestion message="Após estabilizar o login, implemente um feedback visual de 'carregando perfil' na tela de acesso para deixar claro quando a autenticação já passou e o sistema está buscando permissões.">Melhorar feedback de login</lov-suggestion>
</lov-actions>
