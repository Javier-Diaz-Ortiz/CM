import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
    apiKey: "AIzaSyBu2dWIGA7vhXHhxghNnhiUFODJ64R4Abw",
    authDomain: "cm-app-a6505.firebaseapp.com",
    projectId: "cm-app-a6505",
    storageBucket: "cm-app-a6505.firebasestorage.app",
    messagingSenderId: "640144350396",
    appId: "1:640144350396:web:cm-app-a6505"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with persistence
let auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (e) {
    // If auth is already initialized, use the existing instance
    auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export default app;
