import type { R2Storage } from '../interface';

interface StoredObject {
  body: any;
  options?: Record<string, any>;
}

export class VercelR2Adapter implements R2Storage {
  private objects = new Map<string, StoredObject>();

  async put(key: string, body: any, options?: Record<string, any>): Promise<void> {
    this.objects.set(key, { body, options });
  }

  async get(key: string): Promise<any> {
    const obj = this.objects.get(key);
    return obj?.body;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.objects.keys());
    if (prefix) {
      return keys.filter((key) => key.startsWith(prefix));
    }
    return keys;
  }
}
