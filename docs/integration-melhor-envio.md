# Integração Melhor Envio

Este documento descreve como a integração do Melhor Envio deve ser configurada e operada no Atelie OS.

## Objetivo

A integração permite que cada empresa conecte sua própria conta do Melhor Envio para cotação, etiqueta e rastreio, mantendo o fluxo manual disponível quando a integração não estiver conectada ou estiver indisponível.

O modelo é multi-tenant:

- As variáveis de ambiente identificam o aplicativo SaaS do Atelie OS no Melhor Envio.
- Cada tenant autoriza a própria conta via OAuth.
- Os tokens de cada tenant são salvos criptografados no banco, vinculados por `company_id + provider`.
- O navegador nunca recebe `access_token`, `refresh_token`, client secret ou header `Authorization`.

## Variáveis de Ambiente

As variáveis abaixo ficam no servidor. Elas não são por tenant.

```env
# Ambiente do Melhor Envio: sandbox ou production.
MELHOR_ENVIO_ENV="sandbox"

# Credenciais do app OAuth criado no Melhor Envio.
MELHOR_ENVIO_CLIENT_ID=""
MELHOR_ENVIO_CLIENT_SECRET=""

# Callback cadastrado no Melhor Envio.
MELHOR_ENVIO_REDIRECT_URI="http://localhost:3000/api/app/shipping/oauth/callback"

# Escopos solicitados quando o tenant conecta a conta.
MELHOR_ENVIO_SCOPES="shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking"

# Chave usada para criptografar tokens no banco.
INTEGRATION_SECRETS_KEY="replace-with-a-long-random-secret"
```

Exemplo de produção:

```env
MELHOR_ENVIO_ENV="production"
MELHOR_ENVIO_REDIRECT_URI="https://app.seudominio.com.br/api/app/shipping/oauth/callback"
```

Também existem overrides opcionais para homologação ou mudança de endpoint:

```env
MELHOR_ENVIO_WEB_URL=""
MELHOR_ENVIO_AUTH_URL=""
MELHOR_ENVIO_TOKEN_URL=""
```

Deixe esses três vazios no uso normal.

## Configuração no Melhor Envio

1. Crie um aplicativo OAuth no painel do Melhor Envio.
2. Cadastre a URL de callback:
   - Local: `http://localhost:3000/api/app/shipping/oauth/callback`
   - Produção: `https://app.seudominio.com.br/api/app/shipping/oauth/callback`
3. Copie `client_id` e `client_secret` para o ambiente do servidor.
4. Defina `MELHOR_ENVIO_ENV` como `sandbox` durante testes.
5. Gere uma `INTEGRATION_SECRETS_KEY` forte e estável.

Para gerar uma chave:

```bash
openssl rand -base64 32
```

## Fluxo por Tenant

1. O admin ou owner acessa `Configurações > Envio`.
2. A tela exibe se o OAuth está configurado no servidor.
3. O usuário clica em `Conectar Melhor Envio`.
4. O backend cria um `state` assinado com:
   - `companyId`
   - `userId`
   - `provider`
   - expiração curta
5. O usuário autoriza a conta no Melhor Envio.
6. O callback troca o `code` por tokens.
7. O backend criptografa e salva os tokens em `integration_credentials`.
8. A tela passa a mostrar a conta como conectada.

O tenant A e o tenant B podem usar o mesmo aplicativo OAuth do SaaS, mas cada um terá tokens próprios no banco.

## Tabelas

### `integration_credentials`

Guarda credenciais externas por empresa.

Campos principais:

- `company_id`: tenant dono da credencial.
- `provider`: hoje `melhor_envio`.
- `environment`: `sandbox` ou `production`.
- `status`: `connected` ou `disconnected`.
- `access_token_encrypted`: token criptografado.
- `refresh_token_encrypted`: refresh token criptografado.
- `expires_at`: expiração do token.
- `scope`: escopos concedidos.
- `connected_by_user_id`: usuário que conectou.
- `metadata`: metadados sem segredo.

Existe índice único em `company_id + provider`, garantindo uma conexão ativa por provider em cada tenant.

## Segurança

Regras implementadas:

- O frontend não recebe token.
- `client_secret` fica apenas em variável de ambiente do servidor.
- Tokens são criptografados com AES-256-GCM antes de ir para o banco.
- O `state` OAuth é assinado e expira em poucos minutos.
- O callback valida tenant, usuário e provider antes de salvar credenciais.
- Apenas roles de configuração (`owner`, `admin`) conectam, salvam ou desconectam.
- Auditoria registra conexão, desconexão, atualização e cotação sem gravar segredo.

Eventos de auditoria:

- `shipping.connect`
- `shipping.disconnect`
- `shipping.update`
- `shipping.quote`

## Endpoints Internos

### `GET /api/app/shipping`

Retorna configuração visível:

- integração ativa
- conta conectada ou não
- ambiente
- expiração
- CEP/cidade de origem
- serviço padrão

Não retorna tokens.

### `PATCH /api/app/shipping`

Salva opções operacionais:

- ativar/desativar uso do Melhor Envio
- CEP de origem
- cidade de origem
- serviço padrão

Não aceita token manual.

### `DELETE /api/app/shipping`

Desconecta o Melhor Envio do tenant atual, removendo os tokens criptografados.

### `GET /api/app/shipping/oauth/start`

Inicia OAuth do tenant atual.

### `GET /api/app/shipping/oauth/callback`

Recebe `code` e `state`, troca por tokens e salva a credencial criptografada no tenant correto.

## Estado Atual do Produto

A conexão OAuth segura está preparada.

A cotação externa real ainda fica bloqueada no beta local. O endpoint de teste confirma se existe credencial conectada e mantém fallback manual para frete, etiqueta e rastreio.

Antes de liberar cotação real, implementar:

- chamada ao endpoint de cotação do Melhor Envio;
- renovação automática com `refresh_token`;
- tratamento de erro por serviço indisponível;
- logs sem payload sensível;
- testes de sandbox com múltiplos tenants.

## Troubleshooting

### Botão de conectar fica desabilitado

Verifique:

- `MELHOR_ENVIO_CLIENT_ID`
- `MELHOR_ENVIO_CLIENT_SECRET`
- `MELHOR_ENVIO_REDIRECT_URI`

### Callback retorna erro

Verifique se a URL cadastrada no Melhor Envio é exatamente igual à `MELHOR_ENVIO_REDIRECT_URI`.

### Tenant errado recebeu a conexão

Isso não deve acontecer se o `state` estiver válido. O callback valida `companyId`, `userId` e `provider`. Se ocorrer, investigar alteração manual de sessão ou chaves de assinatura inconsistentes entre instâncias.

### Tokens não descriptografam após deploy

`INTEGRATION_SECRETS_KEY` mudou. Essa chave precisa ser estável. Se ela for perdida, os tenants precisarão reconectar suas contas.
