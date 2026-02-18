import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
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
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
    label: { fontSize: 14, color: '#666', marginBottom: 5 },
    value: { fontSize: 18, fontWeight: '500', marginBottom: 15 },
});