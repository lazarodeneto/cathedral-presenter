# Auditoria de segurança — 9 de novembro de 2026

## Resumo executivo

Foi feita uma revisão dirigida do código React/Vite, das dependências npm, da autenticação e dos serviços cloud, da configuração Netlify e do isolamento Electron. Não foi encontrado Next.js nem qualquer dos pacotes React Server Components afetados pelos avisos de outubro. O `npm audit` não comunicou vulnerabilidades conhecidas e os alertas Dependabot foram ativados, sem alertas abertos na consulta inicial. Foi introduzido um limite para reduzir abuso autenticado de uploads. A revisão não constitui teste de intrusão completo nem prova que nunca houve comprometimento.

## Achados

### 1. Alto — serviço online indisponível por limite de utilização

Em 9 de novembro, o domínio Netlify respondeu HTTP 503 com `usage_exceeded`, inclusive para a página inicial. Isso afeta a disponibilidade e impediu testar a autenticação e os cabeçalhos da implantação em produção. O limite específico, a utilização e eventual custo devem ser verificados no painel da conta Netlify; não foi realizada qualquer alteração de plano ou cobrança. Não há evidência de que o limite excedido seja consequência de ataque.

### 2. Médio — consumo de armazenamento por uploads autenticados (mitigação parcial)

Antes da correção, uma conta autenticada podia iniciar um número ilimitado de uploads de workspace de até 32 MiB cada. Os uploads abandonados deixam de ser utilizáveis após uma hora, mas os respetivos dados temporários não têm uma limpeza garantida: ver `server/cloud/workspace.ts:90` e `server/cloud/workspace.ts:105`. Agora os registos criados por conta são limitados a 30 por hora, com uma operação de bloqueio transacional para evitar contornar a limitação com pedidos simultâneos. Esse limite pode produzir HTTP 429 em utilização intensa; não substitui quotas de armazenamento nem elimina dados temporários antigos. Recomenda-se implementar recolha segura, monitorização e quotas globais antes de uso alargado. Não foram apagados dados existentes nesta auditoria.

### 3. Médio — instaladores não assinados

Os instaladores de teste Windows e macOS não possuem assinatura de distribuidor nem autenticação pela Apple, pois os certificados ainda não foram fornecidos. Isso impede aos sistemas operativos confirmar a identidade do distribuidor. Antes da distribuição pública, configurar assinatura Windows, Apple Developer e notarização macOS, e verificar a proveniência de cada artefacto. A última versão publicada deve ser novamente avaliada antes de ser distribuída; um artefacto anterior não recebe automaticamente correções do código.

### 4. Médio — verificação operacional da nuvem incompleta

A integração Google Drive comum e um computador antivírus ainda não foram configurados. `server/cloud/media.ts:89` bloqueia envios quando o scanner não está disponível; isso protege contra publicação sem análise, mas deixa o fluxo cloud de mídia indisponível. Os testes de código não substituem testes com a conta Drive e o scanner reais.

### 5. Baixo — deteção contínua de dependências

Os alertas Dependabot estavam desativados no início e foram ativados durante a revisão. A consulta após a ativação não mostrou alertas abertos. `npm audit` também é executado na validação CI, conforme `.github/workflows/cloud-validation.yml:41`. Resultados de ferramentas automáticas dependem do catálogo e não detetam vulnerabilidades desconhecidas.

## React, Next.js e dependências

- A árvore npm instalada contém React e React DOM 19.3.1; não contém `next`, `react-server-dom-webpack`, `react-server-dom-parcel` nem `react-server-dom-turbopack`.
- Os avisos oficiais [GHSA-xqc2-xf4c-x3h3](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3) e [GHSA-h3gv-c5rc-p453](https://github.com/react/react/security/advisories/GHSA-h3gv-c5rc-p453) dizem respeito a esses pacotes React Server Components, ausentes neste projeto. Verificar novamente se a arquitetura ou dependências mudarem.
- Os [avisos Next.js](https://github.com/vercel/next.js/security/advisories) não se aplicam diretamente à árvore atual porque Next.js não está instalado.
- O `npm audit` em 9 de novembro devolveu zero alertas conhecidos em todas as severidades. Electron 45.2.3, Vite 8.3.5, Better Auth 1.7.18 e pdfjs-dist 6.5.438 foram incluídos na árvore examinada.

## Cobertura e limitações

Foram revistos limites de origem e corpo (`server/cloud/http.ts`), autenticação e funções (`server/cloud/auth.ts`), carregamentos e scanner (`server/cloud/media.ts`), workspace (`server/cloud/workspace.ts`), políticas de segurança (`netlify.toml`) e o isolamento do Electron (`desktop/main.cjs`). Uma procura por `eval`, `new Function`, `dangerouslySetInnerHTML` e atribuições diretas a `innerHTML` no código fonte não encontrou ocorrências. Isto é uma procura dirigida, não uma análise exaustiva de todos os caminhos de dados.

O site de produção estava indisponível durante a revisão; portanto não foram verificados fluxos autenticados nem se os cabeçalhos configurados estavam efetivamente entregues pelo deploy. Não foram examinados logs completos de acesso, auditoria da conta, dispositivos ou histórico de incidentes, pelo que não se pode concluir que não houve invasão ou fuga de dados. A auditoria não incluiu exploração ofensiva em produção nem dados reais dos utilizadores.
