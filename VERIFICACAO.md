# Verificação da migração — 24/10/2026

Material recuperado: `Portal_INVEST_Portugues_V2_Administrador.zip`.

- 12 blocos, 4 textos de interpretação, 77 questões e 10 infográficos preservados.
- Nove testes Node aprovados: integridade estrutural do material; backups inválidos; URLs de imagens e links; progresso importado; invalidação de correções após revisão; ida e volta de progresso; exclusão do editor da publicação; formatos de URL YouTube; restauração de dados após falha de gravação.
- Treze verificações no navegador aprovadas para conteúdo rico, incluindo scripts, eventos, SVG/MathML, marcação malformada, URLs executáveis, CSS, formatação por cores e profundidade excessiva. Para repetir: abra `/tests/browser.html` no servidor local. Essa página não é publicada.
- Conferidos no navegador: navegação, correção com explicação, histórico de tentativas, checklists e persistência após recarregar; cadastro de dois vídeos e persistência da seleção da playlist; `referrerpolicy` do iframe e link externo de fallback.
- Backup de progresso válido importado pelo seletor de arquivos. Backup inválido rejeitado mantendo o estado anterior.
- Pacote público conferido sem botões de edição e sem o arquivo `editor.js`. Tela larga e largura móvel de 390 px verificadas; a largura de conteúdo no modo móvel não excedeu a área disponível.

Os links de vídeos usados na verificação ficaram apenas no navegador de teste. O material recebido tem playlists vazias. Não foi feita revisão pedagógica nova nem conferência integral com edital/BNCC. A reprodução de cada aula no YouTube depende também da disponibilidade do vídeo, da autorização de incorporação e das políticas do navegador.

A área de edição permanece local e sem autenticação. Não há backend nem sincronização de progresso. README e workflow documentam a publicação exclusiva de `dist/` pelo GitHub Pages.
