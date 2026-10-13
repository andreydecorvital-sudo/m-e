# Formulário PMG

Formulário em português, responsivo e sem dependências, para entender a consulta de preços por cliente e a preparação de ofertas da PMG.

## Comportamento

- Uma pergunta por tela, 19 perguntas opcionais e controles grandes para celular.
- Links separados: `/mae` e `/tia`, com rascunhos e perguntas de horário independentes.
- Não sei e perguntas complementares condicionais.
- Rascunho no navegador e salvamento automático remoto durante o preenchimento.
- Checkpoints imutáveis em Vercel Blob privado; requisições antigas não substituem respostas recentes.
- Retomada no mesmo navegador e reenvio quando a conexão voltar.
- Painel `/painel` protegido por chave privada, com respostas parciais, progresso e horário do último salvamento.
- Revisão, cópia e exportação para texto.
- WhatsApp abre com as respostas; a pessoa escolhe o contato e confirma o envio.
- Alternativa para responder por áudio.
- A página informa que as respostas são salvas para o Andrey antes de concluir. Não coleta senhas nem dados de clientes; não tem upload de arquivos.
- O formulário não consulta PMG nem envia mensagens aos clientes.

## Bancada de ofertas

`/ofertas` prepara uma tabela de muçarelas com o catálogo dos 14 produtos conferidos nos exemplos fornecidos. `/ofertas?para=tia` usa um rascunho separado. Preços e pesos reais começam vazios; nenhum valor de 09/10/2026 foi reaproveitado.

- Entrada por campos grandes ou colagem de texto no formato da tabela da PMG. Formato simples alternativo: `Apolo;34,56;4,000`.
- Importação não adivinha produtos ou colunas. Totais inconsistentes e produtos duplicados ficam pendentes para conferência manual. A aplicação substitui todos os valores anteriores para evitar misturar preços de tabelas diferentes.
- Valores em centavos e pesos em gramas; total da peça calculado com o peso real. Sem peso, só o preço por kg aparece.
- Prévia em PNG de 1080 px de largura, logo oficial, data explícita, representantes, contato e observação editáveis.
- Conferência obrigatória antes de salvar, copiar ou abrir o compartilhamento nativo. A pessoa escolhe o destino e confirma o envio no aplicativo.
- Datas passadas ou valores inválidos bloqueiam a preparação. Alterações invalidam a conferência anterior.
- Referência interna não aparece na imagem ou na mensagem. Rascunho apenas no navegador, separado dos formulários e sem upload de preços.
- O compartilhamento de arquivos depende do navegador. Há download e cópia de mensagem como alternativas.

O painel tem links para a bancada. Esta primeira versão trabalha com valores informados pela pessoa; consulta automática ao programa da PMG dependerá do acesso e formato disponíveis.

O frontend está em `index.html` e `assets/`. As Functions em `api/` persistem rascunhos em armazenamento privado. O logo oficial fornecido está em `assets/pmg-logo.png` e foi preservado sem alterações.

## Publicação

Projeto independente da PMG, sem dados, integrações ou credenciais de outras operações.

Importar este repositório na Vercel como framework "Other", usando a raiz e a branch `main`. Instalar dependências via `npm install`; não há build de frontend. As Functions e o Blob privado estão em `gru1`.

Variáveis de produção: `PMG_ADMIN_TOKEN_HASH`, `PMG_PUBLIC_ORIGIN`, `BLOB_STORE_ID` e/ou `BLOB_READ_WRITE_TOKEN`. Manter os dados de produção fora dos previews.

O painel recebe uma chave aleatória pelo fragmento do link privado, retira o fragmento do endereço e a conserva apenas na sessão do navegador. A API verifica seu hash. Não incluir a chave no repositório ou no link compartilhado com respondentes.

`?preview=1` permite testar os formulários sem registrar respostas. Testes de produção autenticados usam um namespace separado e não aparecem no painel real.

Validar com `npm test` e um teste de salvamento real após a publicação.

Para abrir o frontend localmente, usar um servidor estático na raiz. Para testar salvamento completo, executar as Functions com as variáveis de um ambiente de desenvolvimento isolado.

O exemplo de tabela de muçarelas foi fornecido em 13/10/2026, com valores datados de 09/10/2026. Os preços não são reproduzidos no formulário.
