// Mock para o Redis em testes
class MockRedis {
  private data: Map<string, any> = new Map();
  private hashData: Map<string, Map<string, string>> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor() {
    // Não vamos emitir eventos automaticamente no constructor
    this.eventHandlers.set('connect', []);
    this.eventHandlers.set('error', []);
  }

  // Mock para pipeline
  pipeline() {
    const operations: Array<any> = [];
    const self = this;

    return {
      hset(key: string, field: string, value: any) {
        operations.push({
          type: 'hset',
          key,
          field,
          value: value.toString()
        });
        return this;
      },
      expire(key: string, seconds: number) {
        operations.push({
          type: 'expire',
          key,
          seconds
        });
        return this;
      },
      exec() {
        // Executar todas as operações acumuladas
        for (const op of operations) {
          if (op.type === 'hset') {
            if (!self.hashData.has(op.key)) {
              self.hashData.set(op.key, new Map());
            }
            self.hashData.get(op.key)?.set(op.field, op.value);
          }
          // Ignoramos expire em testes
        }
        return Promise.resolve([]);
      }
    };
  }

  // Operações básicas do Redis
  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.data.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.data.has(key)) {
        this.data.delete(key);
        count++;
      }
      if (this.hashData.has(key)) {
        this.hashData.delete(key);
        count++;
      }
    }
    return count;
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.hashData.has(key)) {
      this.hashData.set(key, new Map());
    }
    const isNew = !this.hashData.get(key)?.has(field);
    this.hashData.get(key)?.set(field, value);
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.hashData.get(key)?.get(field) || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const hash = this.hashData.get(key);
    if (hash) {
      hash.forEach((value, field) => {
        result[field] = value;
      });
    }
    return result;
  }

  async exists(key: string): Promise<number> {
    return (this.data.has(key) || this.hashData.has(key)) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    // Implementação básica para suportar apenas o formato "prefix:*"
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      const dataKeys = Array.from(this.data.keys()).filter(k => k.startsWith(prefix));
      const hashKeys = Array.from(this.hashData.keys()).filter(k => k.startsWith(prefix));
      return [...new Set([...dataKeys, ...hashKeys])];
    }
    return [];
  }

  // Implementação básica do eval para Lua scripts
  async eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    // Implementação simulada para scripts conhecidos (específicos para nossa aplicação)
    
    // Script para consumeToken
    if (script.includes('if tokens <= 0')) {
      const key = args[0];
      const hash = this.hashData.get(key);
      const tokens = parseInt(hash?.get('tokens') || '0');
      
      if (tokens <= 0) return 0;
      
      hash?.set('tokens', (tokens - 1).toString());
      return 1;
    }
    
    // Script para processQueryResult
    if (script.includes('math.min(tokens + 1, maxTokens)')) {
      const key = args[0];
      const maxTokens = parseInt(args[1]);
      const hash = this.hashData.get(key);
      const tokens = parseInt(hash?.get('tokens') || '0');
      
      const newTokens = Math.min(tokens + 1, maxTokens);
      hash?.set('tokens', newTokens.toString());
      
      return newTokens;
    }
    
    // Script para refillTokens
    if (script.includes('redis.call(\'hset\', KEYS[1], \'lastRefill\'')) {
      const key = args[0];
      const maxTokens = parseInt(args[1]);
      const now = args[2];
      const hash = this.hashData.get(key);
      const tokens = parseInt(hash?.get('tokens') || '0');
      
      const newTokens = Math.min(tokens + 1, maxTokens);
      hash?.set('tokens', newTokens.toString());
      hash?.set('lastRefill', now);
      
      return newTokens;
    }
    
    return null;
  }

  // Event handlers (para compatibilidade)
  on(event: string, callback: Function): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
    return this;
  }

  // Método para simular evento para teste
  emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  // Para testar desconexão
  disconnect(): void {
    // No-op para testes
  }
}

// Exporta a classe mock em vez do Redis real
module.exports = MockRedis; 