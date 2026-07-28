import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAe7qlkdRz-IDmK4oKxN6287Hir0j4Hq2k",
  authDomain: "qlvb-phurieng.firebaseapp.com",
  databaseURL: "https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "qlvb-phurieng",
  storageBucket: "qlvb-phurieng.firebasestorage.app",
  messagingSenderId: "513838855886",
  appId: "1:513838855886:web:f5e164272998f94ad9029f"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
