type DebugMessageCallback = (message: string) => void;

class DebugManager {
  private static instance: DebugManager;
  private callbacks: Set<DebugMessageCallback> = new Set();

  private constructor() {}

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  subscribe(callback: DebugMessageCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  publish(message: string): void {
    this.callbacks.forEach(callback => callback(message));
  }
}

export const debugManager = DebugManager.getInstance(); 