# Formulário PMG

Formulário em português, responsivo e sem dependências, para entender a consulta de preços por cliente e a preparação de ofertas da PMG.

## Comportamento

- Quatro etapas; nenhuma pergunta obrigatória.
- Não sei e perguntas complementares condicionais.
- Rascunho em localStorage no próprio navegador, com aviso quando indisponível.
- Revisão, cópia e exportação para texto.
- WhatsApp abre com as respostas; a pessoa escolhe o contato e confirma o envio.
- Alternativa para responder por áudio.
- Não coleta senhas, não envia dados para um servidor, não tem upload de arquivos.
- Não consulta PMG, não gera ofertas nem envia mensagens aos clientes.

`index.html` é servido diretamente como site estático. O logo oficial fornecido está em `assets/pmg-logo.png` e foi preservado sem alterações.

## Publicação

Projeto independente da PMG, sem dados, integrações ou credenciais de outras operações.

Importar este repositório na Vercel como framework "Other", usando a raiz do repositório e a branch `main`. Não precisa instalar dependências nem executar um build. O formulário é público; cada rascunho fica no navegador de quem responde.

Para abrir localmente, usar um servidor estático na raiz. Uma cópia do arquivo com o logo incorporado também é disponibilizada para encaminhamento.

O exemplo de tabela de muçarelas foi fornecido em 13/10/2026, com valores datados de 09/10/2026. Os preços não são reproduzidos no formulário.
