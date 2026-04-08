import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// Sin Firebase Storage: Guardaremos la foto comprimida directamente en Firestore
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View, Image, TouchableOpacity, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // --- VARIABLES NUEVAS PARA EL NOMBRE ---
    const [name, setName] = useState('');
    const [savingName, setSavingName] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData(data);
                        // NUEVO: Si el usuario ya tiene nombre en la base de datos, lo mostramos
                        if (data.name) {
                            setName(data.name);
                        }
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
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tus fotos.');
            return;
        }

        // Exactamente igual a como lo tenían tus compañeros
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.2, 
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

            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                photoURL: imageBase64
            });

            const downloadURL = imageBase64;

            setUserData(prev => ({ ...prev, photoURL: downloadURL }));
            Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
        } catch (error) {
            console.error("Error al subir imagen:", error);
            Alert.alert('Error', 'No se pudo subir la imagen. Verifica las reglas de Storage.');
        } finally {
            setUploading(false);
        }
    };

    // --- FUNCIÓN NUEVA PARA GUARDAR EL NOMBRE ---
    const handleSaveName = async () => {
        const user = auth.currentUser;
        if (!user || !name.trim()) {
            Alert.alert('Aviso', 'El nombre no puede estar vacío.');
            return;
        }

        setSavingName(true);
        try {
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                name: name.trim()
            });
            Alert.alert('Éxito', 'Nombre actualizado correctamente.');
            setUserData(prev => ({ ...prev, name: name.trim() }));
        } catch (error) {
            console.error("Error al guardar nombre:", error);
            Alert.alert('Error', 'No se pudo actualizar el nombre.');
        } finally {
            setSavingName(false);
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
                {/* --- NUEVO BLOQUE: Input para el nombre --- */}
                <Text style={styles.label}>Nombre o Apodo:</Text>
                <View style={styles.nameRow}>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ej: Juan Pérez"
                        editable={!savingName}
                    />
                    <TouchableOpacity 
                        style={[styles.saveBtn, savingName && { backgroundColor: '#80BFFF' }]} 
                        onPress={handleSaveName} 
                        disabled={savingName}
                    >
                        {savingName ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Guardar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Lo que ya estaba */}
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
    
    // --- ESTILOS NUEVOS (Al final del todo para no molestar) ---
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: '#fafafa',
        marginRight: 10,
    },
    saveBtn: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});