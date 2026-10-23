# Diagnósticos LoDIR

A página `/diagnosticos` consulta as seis fontes históricas e permite criar, consultar, editar e excluir diagnósticos no Firebase. Há layout móvel próprio, sem alterar o layout das demais páginas.

## Levantamentos e Pontos Viciados

A entrada da página é a aba **Levantamentos**. Cada card representa uma fonte histórica ou um trimestre em preenchimento. Levantamentos em preenchimento aparecem primeiro, seguidos pelos históricos do mais recente ao mais antigo. A revisão de 19/10/2026 mantém identificação própria.

O trimestre atual é apresentado como levantamento a iniciar; a lista de códigos do catálogo é persistida ao abrir seu preenchimento pela primeira vez. Outros trimestres podem ser criados em **Novo levantamento**. Essa lista fixa é a referência do denominador, acrescida dos pontos novos efetivamente registrados. O progresso conta pontos trimestrais concluídos, sem contar visitas avulsas, campos ou duplicatas. Reabrir um diagnóstico como rascunho retira sua conclusão da contagem.

Os cards têm um accordion laranja com observações compartilhadas, pendências da fonte e data da atualização. As configurações são persistidas em documentos da coleção `appSettings`, com `type: diagnostico-levantamento` e controle de revisão. As regras existentes dessa coleção já permitem acesso autenticado; não é necessária uma nova coleção de permissões para as observações.

O download do card tem **exatamente 49 colunas, A:AW**: módulos na primeira linha, enunciados completos da versão na segunda e dados a partir da terceira. Atualizações salvas substituem as linhas originais. Pontos novos ficam ao final, destacados em amarelo. Datas e números mantêm tipos de planilha e campos sem resposta permanecem vazios. O arquivo serve para copiar para a matriz oficial; não inventa respostas para os pontos pendentes.

A aba **Pontos Viciados** mantém a consulta e o CRUD dos diagnósticos, a busca, os filtros, as fotos e a exportação analítica separada. Na aba de levantamentos, **Continuar preenchimento** abre a lista completa de pontos esperados com filtros de pendência, rascunho e conclusão.

## Uso

1. Entre no AGIR e abra **Diagnósticos** no menu.
2. Em **Planilhas históricas**, escolha uma das seis versões e consulte os detalhes por etapa. A revisão de 19/10/2026 permanece separada do levantamento original de 2026-T3.
3. Use **Importar esta versão** para gravar aquela fonte no Firebase. A operação não substitui documentos existentes, inclusive quando repetida ou retomada após falha.
4. Em **Registros Firebase**, selecione a competência para consultar, editar ou excluir. **Nova visita** reaproveita somente a identificação do local, sem copiar respostas sobre resíduos e riscos.
5. **Novo diagnóstico** cria uma visita ou um levantamento trimestral. Rascunhos no Firebase exigem código, endereço e data válidos. A conclusão valida os demais campos aplicáveis. Concluído não significa aprovado pela prefeitura.
6. O Excel e o JSON contêm os registros filtrados, independentemente da página da lista. O Excel é uma exportação analítica, e não reproduz o modelo oficial de entrega LoDIR.

## Configuração

Reutiliza Firebase Auth, Firestore e o armazenamento R2 já configurados no projeto. A API autenticada `/api/diagnosticos/historico` verifica assinatura, validade e projeto do token usando os certificados públicos do Firebase e `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. A consulta e a importação não exigem arquivo de conta de serviço. Não coloque credenciais nos JSON gerados.

A importação ocorre no navegador com a sessão autenticada e as regras do Firestore, em transações de 20 registros. Registros existentes são preservados. Se houver falha, a interface informa quantos foram criados e permite repetir a operação. Operações administrativas de outros módulos continuam exigindo suas credenciais próprias.

As regras de `firestore.rules` incluem a coleção `diagnosticos`. **Publique essas regras no projeto Firebase antes de usar o CRUD pelo navegador ou pelo futuro app.** Nesta implementação não houve publicação de regras, deploy da aplicação nem importação de dados para o Firebase real. A importação das fontes é acionada explicitamente na página.

As fotos usam o prefixo `diagnosticos/<diagnosticoId>/<fotoId>.<ext>` nas rotas de storage existentes. Até 12 fotos JPEG/PNG/WebP por registro, com até 20 MB por arquivo antes da compressão. Excluir um diagnóstico remove primeiro o documento e depois tenta limpar as fotos. Falhas de limpeza são informadas e podem deixar objetos órfãos para manutenção. A remoção é definitiva e requer confirmação na interface.

## Estrutura para integração

- `lib/diagnosticos.ts`: contrato `Diagnostic`, respostas identificadas por chaves estáveis, validações e versão do questionário.
- `lib/firestore/diagnosticos.ts`: CRUD autenticado, consulta por competência e controle de concorrência por `revision`.
- `fields.json`: 49 campos com rótulos curtos, coluna original, etapa e instruções/alternativas de cada versão.
- `historical.json`: 2.859 registros de seis fontes, com hash, arquivo, aba e linha originais. Contém revisões do mesmo trimestre e não deve ser somado como se representasse visitas independentes.

Coleção: `diagnosticos`. Campos principais: `id`, `schemaVersion`, `questionnaireVersion`, `kind`, `period`, `state`, `pointId`, `answers`, `observedStatus`, `notes`, `photos`, `sourceId`, `source`, `revision`, autoria e timestamps. `pointId` usa atualmente o código territorial existente no mapa, como `CV-001`. O ID do diagnóstico é independente do código editável, preservando a identidade do documento.

IDs de campo são UUIDs. IDs históricos são determinísticos: `hist-<sourceId>-<codigo>`. Editar um registro histórico no Firebase preserva sua origem e não altera os XLSX. Cada reenvio verifica a revisão em uma transação e recusa sobrescrever edição concorrente. Uma importação explícita futura pode recriar um documento histórico que tenha sido excluído.

As regras seguem o padrão atual do projeto: usuários autenticados podem ler e gerenciar diagnósticos. Não há fluxo de aprovação por cargo nesta etapa. As novas coleções/regras não substituem os pontos do mapa nem o histórico de revitalizações existente. Algumas fontes antigas contêm alternativas preenchidas fora das listas do próprio modelo. A edição permite preservar alternativas históricas inalteradas; a conclusão exige revisão dessas alternativas, sem normalização silenciosa.

## Rascunhos e conexão

As respostas do formulário são salvas localmente por conta e podem ser recuperadas em **Retomar rascunho**. Há um rascunho local mais recente por usuário/aparelho. Fotos ainda não enviadas ficam apenas na memória até salvar; se fechar, será necessário selecioná-las novamente. Fotos enviadas com sucesso antes de uma falha posterior de gravação mantêm suas URLs no rascunho para nova tentativa.

Não há PWA, fila offline, sincronização em segundo plano nem publicação no mapa nesta entrega. As gravações e os uploads dependem de conexão. Esses recursos podem usar o mesmo contrato de dados em uma próxima etapa.

## Atualizar fontes e testar

Para regenerar os JSON a partir dos XLSX locais:

```powershell
py -3 -m pip install -r scripts/requirements-diagnosticos.txt
npm run prepare:diagnosticos
```

O script exclui a linha incompleta 540, que contém apenas ST-059, preservando o diagnóstico completo da linha 467 na revisão. Os arquivos XLSX são somente lidos. O importador atual prepara as seis fontes conhecidas, não aceita automaticamente qualquer novo layout ou arquivo adicional.

```powershell
npm run test:diagnosticos
npx tsc --noEmit
npm run build
```

Os testes verificam contagens, identidade e separação das revisões, exclusão da linha incompleta, alternativas versionadas, validações de rascunho/conclusão, datas, coordenadas, regra de inatividade e chaves de foto. A verificação autenticada de CRUD, upload e responsividade em aparelhos reais deve ser realizada após publicar as regras e entrar no aplicativo.
