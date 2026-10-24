# Administração on-line do Portal INVEST 2027

Este serviço complementa o portal público hospedado no GitHub Pages. Mantém o editor da V2 para textos, formatação, imagens, questões, gabaritos e vários vídeos por bloco. O conteúdo é lido do repositório `faraujo2311/portal-invest-2027-portugues`, arquivo `data.js`, branch `main`.

## Acesso

O serviço é privado e restrito ao proprietário pela autenticação da hospedagem Sites. A autorização adicional do GitHub usa um GitHub App particular e o fluxo oficial OAuth com PKCE. Somente a conta GitHub de ID `67614375` pode ler ou publicar pelo serviço. O nome de login é apresentado como `faraujo2311`.

Na primeira visita, **Configurar integração com GitHub** abre o cadastro oficial de um GitHub App com leitura/gravação de conteúdo e leitura dos metadados. Na instalação, selecione **somente** `portal-invest-2027-portugues`. Depois use **Entrar com GitHub**. Nenhuma senha ou token precisa ser copiado para o editor ou para o chat.

As credenciais devolvidas pelo GitHub são recebidas pelo servidor e cifradas em D1 com AES-GCM. A chave `ADMIN_ENCRYPTION_KEY` fica como segredo da hospedagem. A chave privada gerada pelo manifesto não é armazenada: o serviço utiliza apenas autorizações do usuário. Cookies de sessão são opacos, HttpOnly, Secure, SameSite=Lax e expiram em até quatro horas. Sessões e estados OAuth são vinculados à identidade autenticada da hospedagem.

## Editar e publicar

1. Entre na administração e selecione o bloco.
2. Use Conteúdo, Textos, Questões, Vídeos ou Imagens.
3. Revise pela opção Voltar a estudar. As alterações são rascunhos neste navegador.
4. Clique em **Publicar alterações**. A atualização registra um commit no GitHub e dispara o workflow já existente do Pages.
5. Use **Acompanhar publicação** para conferir o resultado. A mensagem de envio ao GitHub não significa que o deploy já terminou.

Se o conteúdo mudar no GitHub durante a edição, o servidor rejeita a versão antiga. Exporte o rascunho e recarregue a fonte antes de incorporar as diferenças. Rascunhos de versões antigas podem ser baixados, mas não são restaurados automaticamente sobre uma versão nova.

O progresso dos estudantes continua local a cada navegador e separado do conteúdo compartilhado. O editor não sincroniza progresso dos estudantes.

## Código e publicação

O serviço usa o starter Vinext da hospedagem Sites, preservando seu controle de acesso. O manifesto `.openai/hosting.json` declara D1 como `DB`. O schema e as migrações ficam em `db/` e `drizzle/`.

```sh
node --test tests/admin-api.test.mjs
npm run build
```

`scripts/sync-editor.mjs caminho/para/o/portal` copia o editor e a validação compartilhada para `public/editor/`. As credenciais não entram nesses arquivos. Não publique `.env*`, `.dev.vars*`, bancos locais ou chaves privadas.

O backend aceita apenas operações pré-definidas. A publicação escreve exclusivamente `data.js` na `main` do repositório fixo. Há validação de estrutura, tamanho, identidade, sessão, origem, CSRF, revisão SHA e identificador de envio. Leituras e resultados administrativos usam `Cache-Control: private, no-store`.
