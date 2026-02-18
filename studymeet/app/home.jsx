import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { arrayRemove, arrayUnion, collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
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

    const handleJoin = async (sessionId, currentParticipants = []) => {
        try {
            const sessionRef = doc(db, "study_sessions", sessionId);
            const isJoined = currentParticipants.includes(user.uid);

            if (isJoined) {
                // Si ya está, lo quitamos
                await updateDoc(sessionRef, {
                    participants: arrayRemove(user.uid)
                });
            } else {
                // Si no está, lo añadimos
                await updateDoc(sessionRef, {
                    participants: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error("Error al gestionar unión:", error);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

    if (!user) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>StudyMeet</Text>
                <View style={styles.buttonContainer}>
                    <Button title="Iniciar Sesión" onPress={() => router.push("/login")} />
                    <View style={{ height: 10 }} />
                    <Button title="Registrarse" onPress={() => router.push("/register")} color="#34C759" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Hola, {user.email.split('@')[0]} 👋</Text>
                <TouchableOpacity onPress={() => router.push("/profile")}>
                    <Text style={styles.profileLink}>Mi Perfil</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Próximas quedadas:</Text>

            <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isJoined = item.participants?.includes(user.uid);
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardSubject}>{item.subject}</Text>
                                <Text style={styles.cardInfo}>📍 {item.location}</Text>
                                <Text style={styles.cardInfo}>⏰ {item.time}</Text>
                                <Text style={styles.cardUser}>Por: {item.creatorEmail}</Text>
                            </View>
                            
                            <View style={styles.cardFooter}>
                                <Text style={styles.participantCount}>
                                    👥 {item.participants?.length || 0} alumnos
                                </Text>
                                <TouchableOpacity 
                                    style={[styles.joinButton, isJoined && styles.joinedButton]}
                                    onPress={() => handleJoin(item.id, item.participants)}
                                >
                                    <Text style={styles.joinButtonText}>
                                        {isJoined ? "Apuntado" : "Unirme"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={styles.empty}>Nadie ha publicado nada todavía...</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push("/create-session")}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
                <Button title="Cerrar Sesión" onPress={handleLogout} color="#FF3B30" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#F0F2F5' },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    welcome: { fontSize: 20, fontWeight: 'bold', color: '#1C1E21' },
    profileLink: { color: '#007AFF', fontWeight: '600' },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
    buttonContainer: { width: '100%', maxWidth: 300 },
    subtitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#4B4B4B' },
    card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardSubject: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
    cardInfo: { fontSize: 14, color: '#4B4B4B', marginTop: 4 },
    cardUser: { fontSize: 12, color: '#999', marginTop: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
    participantCount: { fontSize: 14, color: '#666' },
    joinButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
    joinedButton: { backgroundColor: '#34C759' },
    joinButtonText: { color: '#fff', fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    fab: { position: 'absolute', bottom: 80, right: 25, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    fabText: { color: '#fff', fontSize: 35, fontWeight: 'light' }
});