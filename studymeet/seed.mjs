import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBu2dWIGA7vhXHhxghNnhiUFODJ64R4Abw",
    authDomain: "cm-app-a6505.firebaseapp.com",
    projectId: "cm-app-a6505",
    storageBucket: "cm-app-a6505.firebasestorage.app",
    messagingSenderId: "640144350396",
    appId: "1:640144350396:web:cm-app-a6505"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dummySessions = [
    {
        title: "Repaso de Python",
        subject: "Programación II",
        description: "Estudio intensivo de listas y diccionarios.",
        creatorId: "dummy123",
        participants: [],
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        location: { latitude: 40.418, longitude: -3.705 },
        createdAt: new Date().toISOString(),
    },
    {
        title: "Cálculo en la cafetería",
        subject: "Matemáticas 1",
        description: "Vamos a repasar integrales.",
        creatorId: "dummy456",
        participants: [],
        startTime: new Date(Date.now() + 42400000).toISOString(),
        endTime: new Date(Date.now() + 50000000).toISOString(),
        location: { latitude: 40.420, longitude: -3.701 },
        createdAt: new Date().toISOString(),
    },
    {
        title: "Taller React Native",
        subject: "Mobile Computing",
        description: "Explicar hooks de Firebase y Maps.",
        creatorId: "dummy789",
        participants: [],
        startTime: new Date(Date.now() + 10400000).toISOString(),
        endTime: new Date(Date.now() + 15000000).toISOString(),
        location: { latitude: 40.412, longitude: -3.708 },
        createdAt: new Date().toISOString(),
    }
];

async function seed() {
    for (const session of dummySessions) {
        await addDoc(collection(db, 'sessions'), session);
        console.log("Added doc", session.title);
    }
}
seed().then(() => process.exit(0));
