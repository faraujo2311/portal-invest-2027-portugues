# Editor do Portal INVEST

O portal público continua no GitHub Pages. O botão **Editar conteúdo** abre o mesmo material em modo de edição e solicita apenas a senha compartilhada definida pelo proprietário. Não há login no ChatGPT ou no GitHub nesse fluxo.

## Uso

1. No portal, selecione um bloco e clique em **Editar conteúdo**.
2. Digite a senha de edição.
3. Altere títulos, textos, fontes, tamanhos, cores, imagens, vídeos, questões, referências e blocos.
4. Clique em **Salvar alterações**. A próxima abertura do portal já busca o material atualizado para todos.

Enquanto você edita, o rascunho fica neste navegador. O botão **Salvar alterações** grava no servidor. Use Exportar conteúdo para manter uma cópia JSON. Não há senha no código público: o servidor valida um hash PBKDF2-SHA256, limita tentativas e cria uma sessão protegida de 8 horas. Quem souber a senha pode editar e salvar todo o material.

## Hospedagem e armazenamento

Site existente: https://portal-invest-2027-admin.russet-frost-6442.chatgpt.site

O acesso da hospedagem deve permitir visitantes anônimos para que a tela de senha abra sem uma conta externa. As rotas de escrita continuam protegidas no servidor por senha, sessão, origem e CSRF. GET /api/published fornece apenas o conteúdo publicado e libera CORS exclusivamente para a origem do portal no GitHub Pages. As rotas antigas de OAuth não estão conectadas ao roteador ativo.

O D1 mantém o conteúdo atual em portal_content, versões anteriores em content_versions e contagem de tentativas de senha. Atualizações simultâneas usam comparação de versão; conflitos preservam o rascunho sem sobrescrever a outra edição. A publicação é idempotente. As alterações de conteúdo agora ficam nesse armazenamento, em vez de depender de autorização do GitHub a cada edição. O código do projeto permanece versionado no GitHub. O arquivo data.js é a cópia inicial e a versão de contingência do portal.

## Configuração do servidor

Variáveis secretas no Sites: ADMIN_ENCRYPTION_KEY e ADMIN_PASSWORD_HASH. O hash usa o formato pbkdf2-sha256$100000$salt-base64$hash-base64. Não registre a senha ou o hash no repositório ou no frontend.

As migrações em drizzle/ são aplicadas pelo Sites antes da implantação. A primeira leitura inicializa o conteúdo com lib/default-content.json, preservando as 12 aulas e o vídeo cadastrado. Uma implantação posterior não substitui o material já salvo no banco.

Para sincronizar recursos do editor a partir do portal: node scripts/sync-editor.mjs. A tela de senha e online.js são mantidos separadamente. Verificação: node --test tests/admin-api.test.mjs tests/password-api.test.mjs. Use o fluxo oficial do Sites para compilar, empacotar e publicar no mesmo project_id de .openai/hosting.json.
