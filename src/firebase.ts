import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCiyyZNqnelPBIyFCstHZ80hvgn1at1Gow",
  authDomain: "lifeosca.firebaseapp.com",
  databaseURL: "https://lifeosca-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lifeosca",
  storageBucket: "lifeosca.firebasestorage.app",
  messagingSenderId: "432934819080",
  appId: "1:432934819080:web:4e951a330c742a5abcc8bd",
  measurementId: "G-V8W5Z3N2P9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
