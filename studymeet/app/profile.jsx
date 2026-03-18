import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// Sin Firebase Storage: Guardaremos la foto comprimida directamente en Firestore
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    // Buscamos el documento en la colección 'users' que coincida con el UID
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    } else {
                        console.log("No se encontró el documento en Firestore");
                    }
                }
            } catch (error) {
                console.error("Error al obtener datos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const pickImage = async () => {
        // Pedir permisos
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tus fotos.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.2, // Muy comprimida para que quepa como texto en la base de datos
            base64: true,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0]);
        }
    };

    const uploadImage = async (asset) => {
        const user = auth.currentUser;
        if (!user) return;

        setUploading(true);
        try {
            const imageBase64 = `data:image/jpeg;base64,${asset.base64}`;

            // Hack genial: guardamos la imagen reducida y empaquetada como texto
            // directamente en el usuario. Así no necesitas pagar suscripción web.
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                photoURL: imageBase64
            });

            const downloadURL = imageBase64;

            // Actualizar estado local
            setUserData(prev => ({ ...prev, photoURL: downloadURL }));
            Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
        } catch (error) {
            console.error("Error al subir imagen:", error);
            Alert.alert('Error', 'No se pudo subir la imagen. Verifica las reglas de Storage.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mi Perfil</Text>

            <View style={styles.profileHeader}>
                <TouchableOpacity onPress={pickImage} disabled={uploading}>
                    <View style={styles.imageContainer}>
                        {userData?.photoURL ? (
                            <Image source={{ uri: userData.photoURL }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="person" size={50} color="#999" />
                            </View>
                        )}
                        {uploading && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Toca para cambiar foto</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{userData?.email || auth.currentUser?.email}</Text>

                <Text style={styles.label}>Miembro desde:</Text>
                <Text style={styles.value}>
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
            </View>

            <Button title="Volver al Inicio" onPress={() => router.replace('/home')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    profileHeader: { alignItems: 'center', marginBottom: 20 },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 10,
        position: 'relative',
        backgroundColor: '#e1e1e1',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e1e1e1',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#007AFF',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#f5f5f5',
    },
    changePhotoText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
    label: { fontSize: 14, color: '#666', marginBottom: 5 },
    value: { fontSize: 18, fontWeight: '500', marginBottom: 15 },
});