import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';
import { auth, db } from "../services/firebase";
import { subscribeToActiveSessions, seedDummyData } from "../services/sessions";
export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [region, setRegion] = useState({
        latitude: 40.4168,
        longitude: -3.7038,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                try {
                    let currentPos = await Location.getCurrentPositionAsync({});
                    setRegion({
                        latitude: currentPos.coords.latitude,
                        longitude: currentPos.coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                } catch (e) { }
            }
        })();
    }, []);

    useEffect(() => {
        let unsubscribeSessions;
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                unsubscribeSessions = subscribeToActiveSessions((data) => {
                    setSessions(data);
                });
            } else {
                setSessions([]);
                if (unsubscribeSessions) {
                    unsubscribeSessions();
                    unsubscribeSessions = null;
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSessions) {
                unsubscribeSessions();
            }
        };
    }, []);


   const handleLogout = async () => {
    try { 
        await signOut(auth); 
    } catch (e) { 
        console.error(e);
        Alert.alert("Error", "No hemos podido cerrar tu sesión. Comprueba tu conexión a internet."); 
    }
    

    const handleJoin = async (sessionId, currentParticipants = []) => {
        try {
            const sessionRef = doc(db, "sessions", sessionId);
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
            // fetchSessions() ya no es necesario, onSnapshot lo actualizará
        // ... código anterior ...
        } catch (error) {
            console.error("Error al gestionar unión:", error);
            Alert.alert("Uy, algo falló", "No hemos podido procesar tu solicitud para unirte o salir de la sesión.");
        }
    };
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
                <TouchableOpacity onPress={() => seedDummyData(user.uid, region.latitude, region.longitude)}>
                    <Text style={{ color: '#9C27B0', fontWeight: 'bold' }}>✨ Fake Data</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/profile")}>
                    <Text style={styles.profileLink}>Mi Perfil</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Próximas quedadas:</Text>

            <MapView
                style={{ width: '100%', height: 350, borderRadius: 15, marginBottom: 15 }}
                region={region}
                showsUserLocation={true}
            >
                {sessions.filter(s => s.location).map(session => {
                    const isJoined = session.participants?.includes(user?.uid);
                    return (
                        <Marker
                            key={session.id}
                            coordinate={{ latitude: session.location.latitude, longitude: session.location.longitude }}
                            pinColor={isJoined ? "green" : "red"}
                            onCalloutPress={() => router.push('/session/' + session.id)}
                        >
                            <Callout tooltip={false}>
                                <View style={styles.calloutContainer}>
                                    <Text style={styles.calloutTitle}>{session.title}</Text>
                                    <Text style={styles.calloutInfo}>{session.subject}</Text>
                                    <Text style={styles.calloutDesc}>{session.description}</Text>
                                    <Text style={[styles.calloutAction, { color: '#007AFF' }]}>
                                        Toca para Ver Detalles
                                    </Text>
                                </View>
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            <Text style={styles.sectionHeader}>Mis quedadas</Text>

            <FlatList
                data={sessions.filter(s => s.participants?.includes(user?.uid))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => router.push('/session/' + item.id)}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardSubject}>{item.title} - {item.subject}</Text>
                            <Text style={styles.cardInfo}>📝 {item.description}</Text>
                            <Text style={styles.cardInfo}>⏰ Inicio: {item.startTime ? new Date(item.startTime).toLocaleString() : 'N/A'}</Text>
                            <Text style={styles.cardInfo}>⏰ Fin: {item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'}</Text>
                        </View>
                        <View style={[styles.cardFooter, { justifyContent: 'flex-start' }]}>
                            <Text style={styles.participantCount}>
                                👥 {item.participants?.length || 0} alumnos (Ver Chat)
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>Todavía no te has unido a ninguna sesión.</Text>}
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
    sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#1C1E21', marginTop: 10, marginBottom: 10 },
    calloutContainer: { width: 220, padding: 5 },
    calloutTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    calloutInfo: { fontSize: 13, color: '#666', marginBottom: 5 },
    calloutDesc: { fontSize: 14, color: '#333', marginBottom: 10 },
    calloutAction: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
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