/**
 * Caché en memoria con caducidad por entrada.
 *
 * Pensada para resultados caros de calcular y baratos de servir repetidos,
 * como el ranking. Es local al proceso: con varias instancias (Fase 8.2) cada
 * una tendrá la suya, lo cual es aceptable para datos que toleran segundos de
 * desfase. Para datos que no lo toleren, invalidar explícitamente al escribir.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();
  private hits = 0;
  private misses = 0;

  constructor(private readonly ttlMs: number) {}

  /** Devuelve el valor cacheado o lo calcula, lo guarda y lo devuelve. */
  async getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.hits += 1;
      return cached.value;
    }

    this.misses += 1;
    const value = await compute();
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  /** Vacía toda la caché. Se llama cuando cambia lo que la alimenta. */
  clear(): void {
    this.entries.clear();
  }

  stats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.entries.size };
  }
}
