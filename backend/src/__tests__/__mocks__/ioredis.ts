class MockRedis {
  private data: Map<string, any> = new Map();
  private hashData: Map<string, Map<string, string>> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor() {
    this.eventHandlers.set("connect", []);
    this.eventHandlers.set("error", []);
  }

  pipeline() {
    const operations: Array<any> = [];
    const self = this;

    return {
      hset(key: string, field: string, value: any) {
        operations.push({
          type: "hset",
          key,
          field,
          value: value.toString(),
        });
        return this;
      },
      expire(key: string, seconds: number) {
        operations.push({
          type: "expire",
          key,
          seconds,
        });
        return this;
      },
      exec() {
        for (const op of operations) {
          if (op.type === "hset") {
            if (!self.hashData.has(op.key)) {
              self.hashData.set(op.key, new Map());
            }
            self.hashData.get(op.key)?.set(op.field, op.value);
          }
        }
        return Promise.resolve([]);
      },
    };
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.data.set(key, value);
    return "OK";
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
    
    if (!result.lastRefill && result.tokens) {
      result.lastRefill = new Date().toISOString();
    }
    
    return result;
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) || this.hashData.has(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      const dataKeys = Array.from(this.data.keys()).filter((k) =>
        k.startsWith(prefix)
      );
      const hashKeys = Array.from(this.hashData.keys()).filter((k) =>
        k.startsWith(prefix)
      );
      return [...new Set([...dataKeys, ...hashKeys])];
    }
    return [];
  }

  async eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    if (script.includes("if tokens <= 0")) {
      const key = args[0];
      const hash = this.hashData.get(key);
      const tokens = parseInt(hash?.get("tokens") || "0");

      if (tokens <= 0) return 0;

      hash?.set("tokens", (tokens - 1).toString());
      return 1;
    }

    if (script.includes("math.min(tokens + 1, maxTokens)")) {
      const key = args[0];
      const maxTokens = parseInt(args[1]);
      const hash = this.hashData.get(key);
      const tokens = parseInt(hash?.get("tokens") || "0");

      const newTokens = Math.min(tokens + 1, maxTokens);
      hash?.set("tokens", newTokens.toString());

      return newTokens;
    }

    if (script.includes("redis.call('hset', KEYS[1], 'lastRefill'")) {
      const key = args[0];
      const maxTokens = parseInt(args[1]);
      const now = args[2];
      const hash = this.hashData.get(key);
      const tokens = parseInt(hash?.get("tokens") || "0");

      const newTokens = Math.min(tokens + 1, maxTokens);
      hash?.set("tokens", newTokens.toString());
      hash?.set("lastRefill", now);

      return newTokens;
    }

    return null;
  }

  on(event: string, callback: Function): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  disconnect(): void {}
}

module.exports = MockRedis;
