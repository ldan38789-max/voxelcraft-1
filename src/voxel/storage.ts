import { Slot } from "./inventory";

export interface GameSaveData {
  seed: number;
  playerPos: { x: number; y: number; z: number };
  inventory: {
    slots: Slot[];
    selectedHotbar: number;
  };
}

export class StorageDB {
  private db: IDBDatabase | null = null;
  private dbName = "VoxelGameDB";
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.isInitializing) return this.initPromise!;
    this.isInitializing = true;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata");
        }
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks");
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitializing = false;
        resolve();
      };
      request.onerror = () => {
        this.isInitializing = false;
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  async saveMetadata(data: GameSaveData): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("metadata", "readwrite");
      const store = tx.objectStore("metadata");
      store.put(data, "save1");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadMetadata(): Promise<GameSaveData | null> {
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("metadata", "readonly");
      const store = tx.objectStore("metadata");
      const request = store.get("save1");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async hasSave(): Promise<boolean> {
    const data = await this.loadMetadata();
    return !!data;
  }

  async saveChunk(cx: number, cz: number, blocks: Uint8Array): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("chunks", "readwrite");
      const store = tx.objectStore("chunks");
      store.put(blocks, `${cx},${cz}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadChunk(cx: number, cz: number): Promise<Uint8Array | null> {
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("chunks", "readonly");
      const store = tx.objectStore("chunks");
      const request = store.get(`${cx},${cz}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["metadata", "chunks"], "readwrite");
      tx.objectStore("metadata").clear();
      tx.objectStore("chunks").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const storage = new StorageDB();
