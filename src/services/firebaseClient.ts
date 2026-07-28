import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { api } from './api';

let firebaseApp: any = null;
let isListening = false;
let isInitialized = false;

export async function initFirebaseRealtime(onDataChanged: () => void) {
  if (isInitialized) return;

  try {
    const config = await api.getFirebaseConfig();
    if (config && config.databaseURL) {
      if (!firebaseApp) {
        firebaseApp = initializeApp(config);
      }

      const db = getDatabase(firebaseApp);
      const updateRef = ref(db, 'lastUpdated');

      onValue(updateRef, (snapshot) => {
        const data = snapshot.val();
        if (isListening && data) {
          console.log('[Firebase] Detected database change. Reloading...');
          onDataChanged();
        }
        isListening = true; // Bỏ qua lần callback đầu tiên lúc vừa kết nối
      });

      isInitialized = true;
      console.log('[Firebase] Realtime connection established.');
    }
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
  }
}
