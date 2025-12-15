import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, push, remove, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDdPSX6rrF2AwX9FXTFv3NBvTnodN7jgTE",
  authDomain: "pos-inventory-5eb73.firebaseapp.com",
  databaseURL: "https://pos-inventory-5eb73-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pos-inventory-5eb73",
  storageBucket: "pos-inventory-5eb73.firebasestorage.app",
  messagingSenderId: "208477913648",
  appId: "1:208477913648:web:9d9b8d675b478f1b9e63f5",
  measurementId: "G-J0WGXMCT2L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper functions for database operations
export const firebaseDB = {
  // Write data
  set: async (path, data) => {
    try {
      await set(ref(database, path), data);
      console.log(`✅ Firebase: Data saved to ${path}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Firebase: Error saving to ${path}:`, error);
      return { success: false, error: error.message || error.toString() };
    }
  },

  // Read data once
  get: async (path) => {
    try {
      const snapshot = await get(ref(database, path));
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error(`❌ Firebase: Error reading ${path}:`, error);
      return { success: false, error };
    }
  },

  // Listen to realtime changes
  onValue: (path, callback) => {
    const dbRef = ref(database, path);
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });
  },

  // Push new item (auto-generate ID)
  push: async (path, data) => {
    try {
      const newRef = push(ref(database, path));
      await set(newRef, data);
      console.log(`✅ Firebase: Item pushed to ${path}`);
      return { success: true, id: newRef.key };
    } catch (error) {
      console.error(`❌ Firebase: Error pushing to ${path}:`, error);
      return { success: false, error };
    }
  },

  // Update specific fields
  update: async (path, data) => {
    try {
      await update(ref(database, path), data);
      console.log(`✅ Firebase: Data updated at ${path}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Firebase: Error updating ${path}:`, error);
      return { success: false, error };
    }
  },

  // Delete data
  remove: async (path) => {
    try {
      await remove(ref(database, path));
      console.log(`✅ Firebase: Data removed from ${path}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Firebase: Error removing ${path}:`, error);
      return { success: false, error };
    }
  },

  // Get reference
  ref: (path) => ref(database, path)
};

export { database, ref, set, get, onValue, push, remove, update };
export default app;
