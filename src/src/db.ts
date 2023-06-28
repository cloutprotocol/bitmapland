import { logError } from './utils';

const DB_NAME = 'bitmap';

export enum DBStore {
  CLAIMED = 'claimed',
  REQUESTED = 'requested',
  REQUESTED_2 = 'requested2',
}

export const createDB = () => {
  return new Promise<IDBDatabase>((resolve) => {
    let db: IDBDatabase | null = null;

    const DBOpenRequest = window.indexedDB.open(DB_NAME, 2);

    DBOpenRequest.onsuccess = () => {
      db = DBOpenRequest.result;

      resolve(db);
    };

    DBOpenRequest.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result;

      db.onerror = () => {
        logError('Error loading DB');
      };

      if (!db.objectStoreNames.contains(DBStore.CLAIMED)) {
        const objectStore = db.createObjectStore(DBStore.CLAIMED);

        objectStore.createIndex('id', 'id', { unique: true });
      }

      if (db.objectStoreNames.contains(DBStore.REQUESTED)) {
        db.deleteObjectStore(DBStore.REQUESTED);
      }

      if (!db.objectStoreNames.contains(DBStore.REQUESTED_2)) {
        const objectStore = db.createObjectStore(DBStore.REQUESTED_2);

        objectStore.createIndex('id', 'id', { unique: true });
      }
    };
  });
};

export const setDBValue = (
  db: IDBDatabase,
  store: DBStore,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
) => {
  return new Promise<void>((resolve) => {
    const transaction = db.transaction([store], 'readwrite');

    transaction.onerror = () => {
      logError('Error creating set transaction in DB');
    };

    const objectStore = transaction.objectStore(store);

    const objectStoreRequest = objectStore.put(value, store);

    objectStoreRequest.onerror = () => {
      logError('Error setting claimed in DB');
    };

    objectStoreRequest.onsuccess = () => {
      resolve();
    };
  });
};

export const getDBValue = (db: IDBDatabase, store: DBStore) => {
  return new Promise<Record<number, boolean>>((resolve) => {
    const transaction = db.transaction([store], 'readonly');

    transaction.onerror = () => {
      logError('Error creating get transaction in DB');
    };

    const objectStore = transaction.objectStore(store);

    const objectStoreRequest = objectStore.get(store);

    objectStoreRequest.onerror = () => {
      logError('Error getting claimed in DB');
    };

    objectStoreRequest.onsuccess = () => {
      resolve(objectStoreRequest.result ?? {});
    };
  });
};
