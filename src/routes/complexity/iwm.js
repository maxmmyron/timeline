export class IterableWeakMap {
    #weakMap = new WeakMap();
    #refSet = new Set();
    #finalizationGroup = new FinalizationRegistry(IterableWeakMap.#cleanup);
  
    static #cleanup({ set, ref }) {
      set.delete(ref);
    }
  
    constructor(iterable = null) {
      if(!iterable) return;
      for (const [key, value] of iterable) {
        this.set(key, value);
      }
    }
  
    /**
     * 
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
      const ref = new WeakRef({key: key});
  
      this.#weakMap.set({key: key}, { value, ref });
      this.#refSet.add(ref);
      this.#finalizationGroup.register({key: key}, {
        set: this.#refSet,
        ref
      }, ref);
    }
  
    /**
     * 
     * @param {string} key 
     * @returns 
     */
    get(key) {
      const entry = this.#weakMap.get({key: key});
      return entry && entry.value;
    }
  
    delete(key) {
      const entry = this.#weakMap.get(key);
      if (!entry) {
        return false;
      }
  
      this.#weakMap.delete(key);
      this.#refSet.delete(entry.ref);
      this.#finalizationGroup.unregister(entry.ref);
      return true;
    }
  
    *[Symbol.iterator]() {
      for (const ref of this.#refSet) {
        const key = ref.deref();
        if (!key) continue;
        const { value } = this.#weakMap.get(key);
        yield [key, value];
      }
    }
  
    entries() {
      return this[Symbol.iterator]();
    }
  
    *keys() {
      for (const [key, value] of this) {
        yield key;
      }
    }
  
    *values() {
      for (const [key, value] of this) {
        yield value;
      }
    }
  }
  