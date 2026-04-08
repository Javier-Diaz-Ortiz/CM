import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from './firebase';

// Obtener los datos del usuario desde Firestore
export const getUserProfile = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

// Actualizar el nombre y la foto de perfil
export const updateUserProfile = async (uid, name, imageUri) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No hay una sesión activa.");

    let photoURL = currentUser.photoURL;

    // Si hay una nueva imagen seleccionada (no es una URL de internet)
    if (imageUri && !imageUri.startsWith('http')) {
        // Convertir la imagen para subirla a Firebase
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Guardarla en Firebase Storage en la carpeta 'profile_pictures'
        const storageRef = ref(storage, `profile_pictures/${uid}`);
        
        // Indicamos que es una imagen jpeg para evitar errores de metadatos
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        
        // Obtener el enlace público de la imagen subida
        photoURL = await getDownloadURL(storageRef);
    }

    // 1. Actualizar en Firebase Auth
    await updateProfile(currentUser, {
        displayName: name,
        photoURL: photoURL || ""
    });

    // 2. Actualizar en Firestore (usamos setDoc con merge por seguridad)
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        name: name,
        photoUrl: photoURL || null
    }, { merge: true });

    return photoURL;
};