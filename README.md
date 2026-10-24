# Portal INVEST 2027 — Língua Portuguesa

Portal em português brasileiro para revisão do 9º ano: teoria, exemplos, dez infográficos, interpretação textual, exercícios com gabaritos comentados, playlists do YouTube e checklist por bloco.

O projeto foi recuperado de **Portal_INVEST_Portugues_V2_Administrador.zip**. A versão 2.1 preserva o material da V2, valida backups e dados salvos, mostra o histórico de tentativas e separa o editor local da publicação.

## Estudar e editar localmente

Com Node.js 22 ou superior, na pasta do projeto:

```sh
npm start
```

Abra **http://127.0.0.1:8765**. Não é necessário instalar dependências. O botão **Modo administrador** abre o editor de textos, formatação, imagens, questões, gabaritos e vários vídeos por bloco. Também é possível usar `INICIAR_PORTAL.bat` com Python 3 instalado; no macOS/Linux, `sh INICIAR_PORTAL.sh`.

O editor é uma ferramenta local, **sem login**. Ele só é habilitado no endereço local do computador. Não exponha esse servidor à rede. O conteúdo editado fica no localStorage do navegador e deve ser exportado em JSON para ser incorporado à fonte do projeto.

## Publicação no GitHub Pages

```sh
npm test
npm run build
npm run preview
```

A prévia pública fica em **http://127.0.0.1:8766**. O build gera `dist/` com a área de estudos e os arquivos necessários. O editor, os backups, scripts, testes e imagens de prévia não entram nesse pacote. Os caminhos são relativos, permitindo publicação em um subdiretório do Pages.

No repositório GitHub, configure **Settings → Pages → Build and deployment → Source → GitHub Actions**. O workflow `.github/workflows/pages.yml` testa o projeto e publica **somente `dist/`**, a cada atualização de `main` ou execução manual.

GitHub Pages é hospedagem estática: não oferece autenticação, banco de dados ou gravação compartilhada para esse editor. A fonte do editor pode ser consultada em um repositório público; ela não contém credenciais e não concede permissão de edição no GitHub. Uma futura área de administração on-line precisará de autenticação, autorização no servidor, armazenamento e histórico de alterações.

Referência: [workflows oficiais do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Atualizar o material publicado

1. Faça as alterações no editor local.
2. Clique em **Exportar conteúdo** e guarde o JSON.
3. Incorpore o arquivo à fonte:

   ```sh
   node scripts/import-content.mjs "caminho/INVEST_portugues_conteudo_editado.json"
   npm test
   npm run build
   ```

4. Confira a prévia e envie as alterações de `data.js` para `main`. O workflow publicará a nova versão.

A importação cria `data.before-import.js` como cópia anterior, ignorada pelo Git. O script valida tamanho, estrutura, identificadores, alternativas, gabaritos e fontes de imagem. Textos formatados também são sanitizados na exibição. Imagens incorporadas entram em `data.js`; prefira arquivos em `assets/` para material volumoso.

## Progresso e backups

- Os checks, respostas, correções, seleção de vídeo e até 200 tentativas ficam **apenas neste navegador e nesta origem**. Não há sincronização entre dispositivos, contas, localhost e o site público.
- **Baixar progresso** guarda uma cópia JSON. **Importar progresso** restaura esse arquivo após confirmação. Os backups da primeira versão também são aceitos.
- O histórico do bloco mostra as dez tentativas mais recentes; o backup mantém as 200 últimas do portal.
- Alterar enunciados, alternativas ou gabaritos invalida as respostas e a correção daquele conjunto. O histórico continua como registro das tentativas anteriores.
- O site público usa o conteúdo versionado em `data.js`, sem carregar edições antigas de conteúdo do localStorage. Para transferir edições já feitas na V2 em outra origem, primeiro exporte-as no navegador original e importe o JSON no editor local.
- Falha de armazenamento é informada na tela. Limpar os dados do navegador pode apagar o progresso; mantenha backups.

## Vídeos do YouTube

O editor aceita links `watch`, `youtu.be`, `shorts`, `live`, `embed` e playlists. Cada bloco pode ter vários vídeos. O player utiliza uma origem HTTP/HTTPS identificável e a política `strict-origin-when-cross-origin`. Cada aula oferece **Abrir no YouTube**.

O erro 153 indica ausência de `HTTP Referer` ou identificação equivalente. Abrir o arquivo por `file://` pode impedir essa identificação; use o servidor local ou o site publicado. Vídeos privados, removidos, com restrição de incorporação ou bloqueados pelo navegador ainda podem falhar. A configuração do portal reduz a causa conhecida, sem garantir a reprodução de todos os vídeos. [Referência oficial do player](https://developers.google.com/youtube/iframe_api_reference#onError).

A V2 recebida não inclui links de aulas cadastrados: a playlist fica pronta para seus vídeos, sem links inventados. Se você já os cadastrou na versão anterior, exporte o conteúdo daquele navegador.

## Estrutura e continuidade

`index.html`, `app.js`, `core.js`, `styles.css`, `data.js` e `assets/` compõem o portal. `editor.js` contém os recursos de edição local. Os arquivos `preview_admin.png`, `preview_aluno.png` e `LEIA-ME.txt` são referências originais da V2; este README descreve a versão atual.

O material abrange interpretação, classes gramaticais, semântica, adjunto adnominal e complemento nominal, concordância, pontuação, acentuação e ortografia, predicativo, transitividade, produção textual e revisão final. O conteúdo pedagógico recebido foi preservado; o trabalho de migração não constitui nova validação de alinhamento à BNCC ou ao edital.

Próximas evoluções previstas: portal de Matemática, administração autenticada, sincronização de progresso e publicação editorial com revisão. Nenhuma credencial, senha ou token deve ser salvo no código ou nos backups.
