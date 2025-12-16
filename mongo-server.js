#!/usr/bin/env node

/**
 * MCP Server para MongoDB - Super Cartola Manager
 *
 * Servidor Model Context Protocol para interagir com o banco MongoDB.
 *
 * Ferramentas disponíveis:
 * - list_collections: Lista todas as coleções do banco
 * - find_documents: Busca documentos em uma coleção
 * - insert_document: Insere um documento em uma coleção
 * - get_collection_schema: Analisa a estrutura de uma coleção
 */

// Carregar variáveis de ambiente do .env
import 'dotenv/config';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MongoClient } from 'mongodb';
import { z } from 'zod';

// =========================================================================
// 🔐 SELEÇÃO DE AMBIENTE DE BANCO DE DADOS (Prod vs Dev)
// =========================================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const getMongoURI = () => {
  if (IS_PRODUCTION) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ [MCP MongoDB] ERRO: MONGO_URI não configurada para produção!');
      process.exit(1);
    }
    console.error('🔴 [MCP MongoDB] Modo: PRODUÇÃO');
    return uri;
  } else {
    const uri = process.env.MONGO_URI_DEV;
    if (!uri) {
      console.error('❌ [MCP MongoDB] ERRO: MONGO_URI_DEV não configurada para desenvolvimento!');
      process.exit(1);
    }
    console.error('🟢 [MCP MongoDB] Modo: DESENVOLVIMENTO (SAFE)');
    return uri;
  }
};

const MONGODB_URI = getMongoURI();

// Cliente MongoDB (conexão lazy)
let client = null;
let db = null;

/**
 * Conecta ao MongoDB se ainda não estiver conectado
 */
async function getDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.error(`[MCP MongoDB] Conectado ao banco: ${db.databaseName}`);
  }
  return db;
}

/**
 * Analisa o tipo de um valor JavaScript
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array (vazio)';
    const itemType = getValueType(value[0]);
    return `array<${itemType}>`;
  }
  if (value instanceof Date) return 'Date';
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') {
      return 'ObjectId';
    }
    return 'object';
  }
  return typeof value;
}

/**
 * Extrai o schema de um documento recursivamente
 */
function extractSchema(doc, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '(max depth)';
  if (doc === null || doc === undefined) return getValueType(doc);

  if (Array.isArray(doc)) {
    if (doc.length === 0) return [];
    const sample = doc[0];
    if (typeof sample === 'object' && sample !== null) {
      return [extractSchema(sample, maxDepth, currentDepth + 1)];
    }
    return [getValueType(sample)];
  }

  if (typeof doc === 'object') {
    const schema = {};
    for (const [key, value] of Object.entries(doc)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
          !(value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') &&
          !(value instanceof Date)) {
        schema[key] = extractSchema(value, maxDepth, currentDepth + 1);
      } else {
        schema[key] = getValueType(value);
      }
    }
    return schema;
  }

  return getValueType(doc);
}

// Criar servidor MCP
const server = new McpServer({
  name: 'mongodb-server',
  version: '1.0.0',
});

// ============================================================================
// TOOL: list_collections
// ============================================================================
server.tool(
  'list_collections',
  'Lista todas as coleções do banco de dados MongoDB',
  {},
  async () => {
    try {
      const database = await getDatabase();
      const collections = await database.listCollections().toArray();

      const result = collections.map(col => ({
        name: col.name,
        type: col.type
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Erro ao listar coleções: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: find_documents
// ============================================================================
server.tool(
  'find_documents',
  'Busca documentos em uma coleção do MongoDB. Use query em formato JSON para filtrar.',
  {
    collection: z.string().describe('Nome da coleção'),
    query: z.string().default('{}').describe('Query em formato JSON (ex: {"nome": "João"})'),
    limit: z.number().default(10).describe('Número máximo de documentos a retornar')
  },
  async ({ collection, query, limit }) => {
    try {
      const database = await getDatabase();

      // Parse da query JSON
      let parsedQuery;
      try {
        parsedQuery = JSON.parse(query);
      } catch (e) {
        return {
          content: [
            {
              type: 'text',
              text: `Erro ao parsear query JSON: ${e.message}`
            }
          ],
          isError: true
        };
      }

      const documents = await database
        .collection(collection)
        .find(parsedQuery)
        .limit(limit)
        .toArray();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(documents, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Erro ao buscar documentos: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: insert_document
// ============================================================================
server.tool(
  'insert_document',
  'Insere um novo documento em uma coleção do MongoDB',
  {
    collection: z.string().describe('Nome da coleção'),
    document: z.string().describe('Documento em formato JSON a ser inserido')
  },
  async ({ collection, document }) => {
    try {
      const database = await getDatabase();

      // Parse do documento JSON
      let parsedDocument;
      try {
        parsedDocument = JSON.parse(document);
      } catch (e) {
        return {
          content: [
            {
              type: 'text',
              text: `Erro ao parsear documento JSON: ${e.message}`
            }
          ],
          isError: true
        };
      }

      const result = await database
        .collection(collection)
        .insertOne(parsedDocument);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              insertedId: result.insertedId,
              acknowledged: result.acknowledged
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Erro ao inserir documento: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: get_collection_schema
// ============================================================================
server.tool(
  'get_collection_schema',
  'Analisa a estrutura de uma coleção lendo documentos de amostra e retornando as chaves e tipos de dados',
  {
    collection: z.string().describe('Nome da coleção'),
    sampleSize: z.number().default(5).describe('Número de documentos de amostra para analisar')
  },
  async ({ collection, sampleSize }) => {
    try {
      const database = await getDatabase();

      // Buscar documentos de amostra
      const samples = await database
        .collection(collection)
        .find({})
        .limit(sampleSize)
        .toArray();

      if (samples.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `A coleção "${collection}" está vazia ou não existe.`
            }
          ]
        };
      }

      // Contar total de documentos
      const totalCount = await database.collection(collection).countDocuments();

      // Extrair schema do primeiro documento
      const schema = extractSchema(samples[0]);

      // Coletar todas as chaves únicas de todos os samples
      const allKeys = new Set();
      samples.forEach(doc => {
        Object.keys(doc).forEach(key => allKeys.add(key));
      });

      // Verificar índices
      const indexes = await database.collection(collection).indexes();

      const result = {
        collection: collection,
        totalDocuments: totalCount,
        sampledDocuments: samples.length,
        schema: schema,
        allKeys: Array.from(allKeys),
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false
        })),
        sampleDocument: samples[0]
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Erro ao analisar schema: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// Inicialização do servidor
// ============================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP MongoDB] Servidor iniciado e aguardando conexões...');
}

// Cleanup ao encerrar
process.on('SIGINT', async () => {
  console.error('[MCP MongoDB] Encerrando...');
  if (client) {
    await client.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[MCP MongoDB] Encerrando...');
  if (client) {
    await client.close();
  }
  process.exit(0);
});

main().catch((error) => {
  console.error('[MCP MongoDB] Erro fatal:', error);
  process.exit(1);
});
