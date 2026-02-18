import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../services/firebase";

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Escuchar sesiones de estudio en tiempo real
        const q = query(collection(db, "study_sessions"), orderBy("createdAt", "desc"));
        const unsubscribeDocs = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSessions(docs);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeDocs();
        };
    }, []);

    const handleLogout = async () => {
        try { await signOut(auth); } catch (e) { console.error(e); }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

    if (!user) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>StudyMeet</Text>
                <Button title="Iniciar Sesión" onPress={() => router.push("/login")} />
                <View style={{ height: 10 }} />
                <Button title="Registrarse" onPress={() => router.push("/register")} color="#34C759" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Hola, {user.email.split('@')[0]}</Text>
                <TouchableOpacity onPress={() => router.push("/profile")}>
                    <Text style={{ color: '#007AFF' }}>Mi Perfil</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Quedadas actuales:</Text>

            <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.cardSubject}>{item.subject}</Text>
                        <Text style={styles.cardInfo}>📍 {item.location} | ⏰ {item.time}</Text>
                        <Text style={styles.cardUser}>Publicado por: {item.creatorEmail}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No hay quedadas aún. ¡Crea la primera!</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push("/create-session")}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <Button title="Cerrar Sesión" onPress={handleLogout} color="#FF3B30" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    welcome: { fontSize: 18, fontWeight: 'bold' },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
    subtitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
    cardSubject: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    cardInfo: { fontSize: 14, color: '#666', marginVertical: 4 },
    cardUser: { fontSize: 12, color: '#999' },
    empty: { textAlign: 'center', marginTop: 50, color: '#999' },
    fab: { 
        position: 'absolute', bottom: 60, right: 20, 
        backgroundColor: '#007AFF', width: 60, height: 60, 
        borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 
    },
    fabText: { color: '#fff', fontSize: 30, fontWeight: 'bold' }
});