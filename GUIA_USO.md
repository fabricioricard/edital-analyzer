# Analisador Inteligente de Editais - Guia de Uso

Bem-vindo ao **Analisador Inteligente de Editais**, uma ferramenta sofisticada para análise automatizada de editais e chamadas públicas. Esta aplicação utiliza inteligência artificial para extrair e estruturar informações críticas de seus documentos.

## 🚀 Começando

### 1. Acesso à Plataforma

Acesse a ferramenta através do navegador. Você será solicitado a fazer login com sua conta Manus. O login é necessário para manter seu histórico de análises seguro e privado.

### 2. Página Inicial - Upload de Editais

A página inicial apresenta uma interface elegante para upload de documentos:

- **Arraste e solte**: Simplesmente arraste seu arquivo PDF ou DOCX para a área destacada
- **Clique para selecionar**: Alternativamente, clique no botão "Selecionar Arquivo" para navegar em seu computador
- **Formatos suportados**: PDF e DOCX (máximo 50MB por arquivo)

### 3. Processamento e Análise

Após o upload, a ferramenta:

1. Extrai o texto completo do documento
2. Envia o conteúdo para análise via Manus (LLM inteligente)
3. Estrutura as informações em categorias específicas
4. Armazena a análise no banco de dados
5. Redireciona automaticamente para a página de resultados

**Tempo estimado**: 30-60 segundos por documento

## 📊 Visualizando Resultados

### Seções da Análise

Cada análise é apresentada em seções organizadas:

#### **Resumo Executivo**
Uma síntese de 2-3 frases capturando a essência do edital.

#### **Prazos Importantes**
Lista completa de datas críticas com:
- Nome do prazo (ex: "Encerramento de inscrições")
- Data em formato YYYY-MM-DD
- Dias até a data
- **Indicador de criticidade**: Prazos com menos de 7 dias são marcados em vermelho como "CRÍTICOS"

#### **Requisitos**
Organizados por categoria (ex: "Requisitos de Elegibilidade", "Requisitos Técnicos"):
- Cada categoria lista todos os requisitos específicos
- Fácil identificação de tudo que é necessário

#### **Critérios de Seleção**
Detalhamento dos critérios de avaliação:
- Nome do critério
- Peso percentual (quando aplicável)
- Descrição completa

#### **Documentos Exigidos**
Lista consolidada de todos os documentos necessários para participação.

#### **Pontos de Atenção (Alertas)**
Informações importantes destacadas com níveis de severidade:
- **🔴 Alto**: Informações críticas que requerem atenção imediata
- **🟡 Médio**: Informações importantes para considerar
- **🔵 Baixo**: Informações adicionais úteis

#### **Penalidades**
Descrição das sanções aplicáveis em caso de violação das regras.

## 🔔 Notificações de Prazos Críticos

### Alertas Automáticos

Quando um edital contém prazos com **menos de 7 dias** para encerramento:

- Uma notificação automática é enviada ao proprietário da ferramenta
- A análise é marcada com destaque especial na interface
- O alerta aparece na página de histórico para fácil identificação

### Gerenciando Alertas

- Verifique regularmente seu histórico de editais
- Preste atenção aos cards destacados em vermelho
- Use a data de análise para acompanhar quando cada edital foi processado

## 📜 Histórico de Análises

### Acessando o Histórico

Clique em "Histórico" ou navegue para `/history` para ver todos os editais que você analisou.

### Informações Exibidas

Para cada edital no histórico:
- Nome do arquivo
- Data de análise (ex: "há 2 horas")
- Tamanho do arquivo
- Resumo da análise
- Indicadores de alertas (se houver)
- Botão para visualizar análise completa

### Revisitando Análises

Clique em qualquer edital no histórico para retornar à visualização completa da análise. Você pode:
- Revisar todos os detalhes
- Exportar o relatório
- Comparar com outras análises

## 💾 Exportação de Relatórios

### Gerando Relatório em Texto

Na página de análise, clique no botão **"Exportar Relatório"**:

1. Um arquivo `.txt` será baixado automaticamente
2. O arquivo contém a análise completa em formato estruturado
3. Nomeado como `analise-edital-{ID}.txt`

### Conteúdo do Relatório

O relatório exportado inclui:
- Resumo executivo
- Todos os prazos com datas
- Requisitos organizados por categoria
- Documentos exigidos
- Pontos de atenção
- Penalidades

### Usando o Relatório

- Imprima para arquivo PDF se necessário
- Compartilhe com colegas ou equipes
- Arquive para referência futura
- Integre com seus sistemas de gestão

## 🎯 Fluxo Típico de Uso

```
1. Acesso à Plataforma
   ↓
2. Upload do Edital (PDF/DOCX)
   ↓
3. Análise Automática via Manus
   ↓
4. Visualização de Resultados Estruturados
   ↓
5. Revisão de Prazos Críticos e Alertas
   ↓
6. Exportação do Relatório (opcional)
   ↓
7. Armazenamento no Histórico
```

## ⚠️ Dicas Importantes

### Para Melhor Análise

- **Qualidade do PDF**: Certifique-se de que o PDF não está corrompido ou com imagens apenas
- **Tamanho do arquivo**: Mantenha arquivos abaixo de 50MB
- **Idioma**: A ferramenta é otimizada para editais em português

### Interpretando Resultados

- **Prazos críticos**: Sempre verifique manualmente a data atual antes de tomar decisões
- **Requisitos**: A lista é abrangente, mas sempre revise o documento original para casos específicos
- **Alertas**: Use como guia, não como substituição da leitura completa do edital

### Segurança e Privacidade

- Seus editais são armazenados de forma segura
- Apenas você tem acesso às suas análises
- O proprietário recebe notificações apenas de prazos críticos (sem conteúdo sensível)

## 🆘 Suporte e Troubleshooting

### Problemas Comuns

**"Arquivo não foi processado"**
- Verifique se o arquivo é PDF ou DOCX válido
- Tente com um arquivo menor primeiro
- Certifique-se de que o arquivo não está corrompido

**"Análise incompleta ou com erros"**
- Isso pode ocorrer com editais muito complexos ou mal formatados
- Tente exportar e revisar manualmente
- Considere reenviar o arquivo

**"Não consigo acessar meu histórico"**
- Verifique se está logado
- Limpe o cache do navegador
- Tente em outro navegador

## 📱 Compatibilidade

- **Navegadores**: Chrome, Firefox, Safari, Edge (versões recentes)
- **Dispositivos**: Desktop e tablet (mobile tem suporte limitado)
- **Conexão**: Requer internet estável

## 🔐 Segurança

- Todos os dados são transmitidos com criptografia HTTPS
- Senhas nunca são armazenadas localmente
- Sessões expiram automaticamente por segurança
- Dados são protegidos de acordo com as melhores práticas

---

**Versão**: 1.0  
**Última atualização**: Abril de 2026

Para mais informações ou suporte, entre em contato com o administrador da ferramenta.
