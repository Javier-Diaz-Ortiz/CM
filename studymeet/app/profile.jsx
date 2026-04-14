import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// Sin Firebase Storage: Guardaremos la foto comprimida directamente en Firestore
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Image, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.title}>Mi Perfil</Text>
                <View style={{width: 40}} />
            </View>

            <View style={styles.profileHeader}>
                <TouchableOpacity onPress={pickImage} disabled={uploading}>
                    <View style={styles.imageContainer}>
                        {userData?.photoURL ? (
                            <Image source={{ uri: userData.photoURL }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="person" size={50} color="#94A3B8" />
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
                <Text style={styles.label}>NOMBRE</Text>
                <View style={styles.nameRow}>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        editable={!savingName}
                    />
                    {name.trim() !== (userData?.name || '') && (
                        <TouchableOpacity 
                            style={[styles.saveBtn, savingName && { backgroundColor: '#A5B4FC' }]} 
                            onPress={handleSaveName} 
                            disabled={savingName}
                        >
                            {savingName ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>Guardar</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.label}>Correo electrónico</Text>
                <Text style={styles.value}>{userData?.email || auth.currentUser?.email}</Text>

                <Text style={styles.label}>Miembro desde</Text>
                <Text style={styles.value}>
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
    backButton: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    profileHeader: { alignItems: 'center', marginBottom: 32 },
    imageContainer: { width: 128, height: 128, borderRadius: 64, marginBottom: 12, position: 'relative', backgroundColor: '#F1F5F9', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    profileImage: { width: 128, height: 128, borderRadius: 64 },
    placeholderImage: { width: 128, height: 128, borderRadius: 64, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 64, justifyContent: 'center', alignItems: 'center' },
    editBadge: { position: 'absolute', right: 0, bottom: 4, backgroundColor: '#6366F1', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#F8FAFC', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    changePhotoText: { color: '#6366F1', fontSize: 15, fontWeight: '700' },
    card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    label: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    value: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 24 },
    
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    input: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 16, fontSize: 16, color: '#0F172A', marginRight: 12 },
    saveBtn: { backgroundColor: '#6366F1', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }
});