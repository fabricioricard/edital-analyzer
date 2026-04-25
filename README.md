# Analisador Inteligente de Editais

Uma aplicação web elegante e sofisticada para análise automatizada de editais e chamadas públicas, utilizando inteligência artificial para extrair e estruturar informações críticas sem deixar escapar nenhum detalhe importante.

## ✨ Características Principais

- **Upload Inteligente**: Suporte para PDF e DOCX com drag-and-drop
- **Análise via IA**: Utiliza Manus (LLM) para análise estruturada e precisa
- **Extração Completa**: Prazos, requisitos, critérios, documentos exigidos, penalidades
- **Alertas Automáticos**: Notificações para prazos críticos (< 7 dias)
- **Interface Elegante**: Design sofisticado com hierarquia visual clara
- **Histórico Completo**: Acesso a todas as análises anteriores
- **Exportação**: Relatórios em formato texto estruturado
- **Autenticação Segura**: Integração com Manus OAuth

## 🏗️ Arquitetura

### Stack Tecnológico

- **Frontend**: React 19 + Tailwind CSS 4 + TypeScript
- **Backend**: Express 4 + tRPC 11 + Node.js
- **Banco de Dados**: MySQL/TiDB com Drizzle ORM
- **IA**: Manus LLM (integrado)
- **Armazenamento**: S3 (para documentos)

### Estrutura do Projeto

```
analisador-de-editais/
├── client/                      # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx          # Página de upload
│   │   │   ├── AnalysisPage.tsx        # Visualização de análise
│   │   │   └── HistoryPage.tsx         # Histórico de editais
│   │   ├── components/
│   │   ├── lib/trpc.ts                 # Cliente tRPC
│   │   └── App.tsx                     # Roteamento
│   └── index.html
├── server/                      # Backend Node.js
│   ├── routers.ts                      # Procedimentos tRPC
│   ├── db.ts                           # Helpers de banco de dados
│   ├── documentProcessor.ts            # Processamento PDF/DOCX
│   ├── editalAnalyzer.ts               # Análise via LLM
│   ├── storage.ts                      # Integração S3
│   └── _core/                          # Framework (OAuth, LLM, etc)
├── drizzle/                     # Schema e migrações
│   ├── schema.ts                       # Definição de tabelas
│   └── 0001_*.sql                      # Migrações SQL
├── GUIA_USO.md                  # Guia de uso para usuários
├── README.md                    # Este arquivo
└── package.json
```

## 🚀 Começando

### Pré-requisitos

- Node.js 22.13.0+
- pnpm 10.4.1+
- Banco de dados MySQL/TiDB
- Credenciais Manus (fornecidas automaticamente)

### Instalação

1. **Dependências**:
```bash
pnpm install
```

2. **Configuração do Banco de Dados**:
```bash
# Gerar migrações
pnpm drizzle-kit generate

# Aplicar migrações
# (Use a ferramenta webdev_execute_sql do Manus)
```

3. **Variáveis de Ambiente**:
As seguintes variáveis são injetadas automaticamente pelo Manus:
- `DATABASE_URL`: Conexão MySQL
- `JWT_SECRET`: Segredo de sessão
- `VITE_APP_ID`: ID da aplicação OAuth
- `OAUTH_SERVER_URL`: URL do servidor OAuth
- `BUILT_IN_FORGE_API_URL`: URL da API Manus
- `BUILT_IN_FORGE_API_KEY`: Chave da API Manus

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
pnpm dev

# Executar testes
pnpm test

# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start
```

## 📊 Modelo de Dados

### Tabela: `editals`
Armazena informações dos documentos enviados.

```typescript
{
  id: number;                    // ID único
  userId: number;                // ID do usuário
  fileName: string;              // Nome do arquivo
  fileKey: string;               // Chave S3
  fileUrl: string;               // URL do arquivo
  mimeType: string;              // Tipo MIME
  fileSize: number;              // Tamanho em bytes
  title?: string;                // Título extraído
  organization?: string;         // Organização
  createdAt: Date;               // Data de criação
  updatedAt: Date;               // Data de atualização
}
```

### Tabela: `editalAnalyses`
Armazena análises estruturadas.

```typescript
{
  id: number;
  editalId: number;              // Referência ao edital
  userId: number;                // ID do usuário
  summary: string;               // Resumo executivo
  deadlines: Deadline[];         // Prazos identificados
  requirements: Requirement[];   // Requisitos por categoria
  selectionCriteria: Criterion[]; // Critérios de seleção
  requiredDocuments: string[];   // Documentos exigidos
  penalties: Penalty[];          // Penalidades
  alerts: Alert[];               // Pontos de atenção
  hasCriticalDeadline: boolean;  // Tem prazo crítico?
  notificationSent: boolean;     // Notificação enviada?
  rawText: string;               // Texto bruto do documento
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔌 API tRPC

### Endpoints

#### `editals.upload`
**Tipo**: Mutation (Protegido)

Faz upload e analisa um edital.

```typescript
Input: {
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  fileSize: number;
}

Output: {
  edital: Edital;
  analysis: EditalAnalysis;
}
```

#### `editals.list`
**Tipo**: Query (Protegido)

Lista todos os editais do usuário.

```typescript
Output: Edital[]
```

#### `editals.getAnalysis`
**Tipo**: Query (Protegido)

Obtém análise de um edital específico.

```typescript
Input: { editalId: number }
Output: EditalAnalysis | null
```

## 🧪 Testes

O projeto inclui testes unitários cobrindo:

- Cálculo de prazos críticos
- Validação de tipos de documentos
- Extração de extensões de arquivo

```bash
# Executar testes
pnpm test

# Com coverage
pnpm test -- --coverage
```

**Resultado**: 17 testes passando ✅

## 🔔 Sistema de Notificações

Quando um edital contém prazos com menos de 7 dias:

1. A análise é marcada como `hasCriticalDeadline: true`
2. Uma notificação é enviada ao proprietário via `notifyOwner()`
3. O status `notificationSent` é atualizado
4. A interface destaca o edital em vermelho

## 📁 Processamento de Documentos

### Formatos Suportados

- **PDF**: Utilizando `pdf-parse`
- **DOCX**: Utilizando `mammoth`

### Validação

- Máximo 50MB por arquivo
- Validação de MIME type
- Verificação de integridade do arquivo

### Fluxo

```
Upload → Validação → Extração de Texto → Análise LLM → Persistência
```

## 🤖 Análise via Manus LLM

A análise utiliza schema JSON estruturado para garantir:

- **Precisão**: Extração exata de informações
- **Consistência**: Formato padronizado
- **Completude**: Nenhum detalhe importante é deixado de lado

### Prompt de Análise

O sistema envia um prompt detalhado ao Manus que:

1. Identifica TODAS as datas mencionadas
2. Marca prazos críticos (< 7 dias)
3. Lista requisitos por categoria
4. Extrai critérios de seleção com pesos
5. Identifica documentos exigidos
6. Destaca penalidades e alertas

## 🎨 Design e UX

### Paleta de Cores

- **Primária**: Azul (#3B82F6)
- **Sucesso**: Verde (#10B981)
- **Alerta**: Amarelo (#F59E0B)
- **Crítico**: Vermelho (#EF4444)
- **Neutro**: Cinza (escala)

### Tipografia

- **Headings**: Inter Bold
- **Body**: Inter Regular
- **Mono**: Fira Code (para datas/números)

### Componentes

- Utiliza shadcn/ui para consistência
- Tailwind CSS 4 para styling
- Animações suaves com Framer Motion

## 🔐 Segurança

- Autenticação via Manus OAuth
- Verificação de autorização em todas as queries
- Usuários só podem acessar suas próprias análises
- Criptografia HTTPS em produção
- Validação de entrada em todos os endpoints

## 📈 Performance

- Lazy loading de análises
- Paginação no histórico
- Cache de resultados
- Otimização de queries SQL

## 🚀 Deployment

A aplicação está pronta para deployment no Manus:

1. Criar checkpoint via `webdev_save_checkpoint`
2. Clicar em "Publish" na UI do Manus
3. A aplicação será deployada automaticamente

## 📝 Licença

Propriedade do Manus. Todos os direitos reservados.

## 👥 Suporte

Para suporte, documentação e guias de uso, consulte:
- `GUIA_USO.md`: Guia completo para usuários finais
- Documentação do Manus: https://docs.manus.im

---

**Versão**: 1.0  
**Desenvolvido com**: React, Node.js, Manus LLM  
**Status**: Pronto para produção ✅
