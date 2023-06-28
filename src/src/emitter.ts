class EventEmitter<E extends string> {
  private listeners: Record<E, (() => void)[]>;

  public constructor(events: readonly E[]) {
    this.listeners = events.reduce((acc, event) => {
      acc[event] = [];
      return acc;
    }, {} as Record<E, (() => void)[]>);
  }

  on(event: E, listener: () => void) {
    this.listeners[event].push(listener);
  }

  off(event: E, listener: () => void) {
    const index = this.listeners[event].indexOf(listener);

    if (index >= 0) {
      this.listeners[event].splice(index, 1);
    }
  }

  emit(event: E) {
    this.listeners[event].forEach((listener) => listener());
  }
}

export const emitter = new EventEmitter([
  'draw',
  'claimed',
  'requested',
  'count',
]);
