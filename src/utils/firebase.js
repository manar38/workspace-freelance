import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDpjYvZH629ZR9fmoyMLl8vOj8FAMS-3QY",
  authDomain: "workspace-bbb6a.firebaseapp.com",
  projectId: "workspace-bbb6a",
  storageBucket: "workspace-bbb6a.firebasestorage.app",
  messagingSenderId: "462813073982",
  appId: "1:462813073982:web:e6efa01ef9e212b528b76f",
  measurementId: "G-TLJ2LBF66T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const db = getFirestore(app);
export default app