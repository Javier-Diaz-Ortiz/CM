import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from "../services/firebase";
import { subscribeToActiveSessions } from "../services/sessions";
export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
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
    };

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
    

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

    if (!user) {
        return (
            <View style={styles.unauthContainer}>
                <View style={styles.heroSection}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="book" size={56} color="#4F46E5" />
                    </View>
                    <Text style={styles.heroTitle}>StudyMeet</Text>
                    <Text style={styles.heroSubtitle}>Conecta con tu campus, organiza sesiones de estudio grupal y no vuelvas a estudiar en soledad.</Text>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/register")}>
                        <Text style={styles.primaryButtonText}>Empezar ahora</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostButton} onPress={() => router.push("/login")}>
                        <Text style={styles.ghostButtonText}>Ya tengo cuenta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <Text style={styles.welcome}>Hola, {user.email.split('@')[0]} 👋</Text>
                            <TouchableOpacity onPress={() => router.push("/profile")}>
                                <Ionicons name="person-circle" size={44} color="#6366F1" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.subtitle}>Próximas quedadas:</Text>

                        <MapView
                            style={{ width: '100%', height: 380, borderRadius: 24, marginBottom: 16, overflow: 'hidden' }}
                            region={region}
                            showsUserLocation={true}
                        >
                            {sessions.filter(s => s.location).map(session => {
                                const isJoined = session.participants?.includes(user?.uid);
                                return (
                                    <Marker
                                        key={session.id}
                                        coordinate={{ latitude: session.location.latitude, longitude: session.location.longitude }}
                                        pinColor={isJoined ? "red" : "green"}
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

                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
                                onPress={() => setActiveTab('all')}
                            >
                                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Explorar Todo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'my' && styles.tabButtonActive]}
                                onPress={() => setActiveTab('my')}
                            >
                                <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>Mis Quedadas</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                }
                data={activeTab === 'all' ? sessions : sessions.filter(s => s.participants?.includes(user?.uid))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isJoined = item.participants?.includes(user?.uid);
                    return (
                    <TouchableOpacity style={styles.card} onPress={() => router.push('/session/' + item.id)}>
                        <View style={styles.cardContent}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                <Text style={[styles.cardSubject, {flex: 1}]}>{item.title} - {item.subject}</Text>
                                {isJoined && (
                                    <View style={styles.joinedBadge}>
                                        <Text style={styles.joinedBadgeText}>Apuntado</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.cardInfo}>📝 {item.description}</Text>
                            <Text style={styles.cardInfo}>⏰ Inicio: {item.startTime ? new Date(item.startTime).toLocaleString() : 'N/A'}</Text>
                            <Text style={styles.cardInfo}>⏰ Fin: {item.endTime ? new Date(item.endTime).toLocaleString() : 'N/A'}</Text>
                        </View>
                        <View style={[styles.cardFooter, { justifyContent: 'flex-start' }]}>
                            <Text style={styles.participantCount}>
                                👥 {item.participants?.length || 0} alumnos (Ver Detalles)
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}}
                ListEmptyComponent={<Text style={styles.empty}>
                    {activeTab === 'all' ? 'No hay ninguna quedada activa ahora mismo.' : 'Todavía no te has unido a ninguna sesión.'}
                </Text>}
                ListFooterComponent={
                    <View style={{ marginTop: 10, paddingBottom: 110 }}>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Cerrar Sesión</Text>
                        </TouchableOpacity>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push("/create-session")}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    unauthContainer: { flex: 1, backgroundColor: '#F8FAFC', padding: 24, justifyContent: 'center' },
    heroSection: { alignItems: 'center', marginBottom: 64 },
    iconWrapper: { backgroundColor: '#EEF2FF', padding: 24, borderRadius: 32, marginBottom: 32, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 5 },
    heroTitle: { fontSize: 48, fontWeight: '900', color: '#0F172A', marginBottom: 16, letterSpacing: -1.5 },
    heroSubtitle: { fontSize: 18, color: '#64748B', textAlign: 'center', lineHeight: 28, paddingHorizontal: 20 },
    buttonContainer: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: 16 },
    primaryButton: { flexDirection: 'row', backgroundColor: '#4F46E5', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    ghostButton: { padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 2, borderColor: '#E2E8F0' },
    ghostButtonText: { color: '#475569', fontSize: 18, fontWeight: '700' },

    container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    welcome: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    profileLink: { color: '#6366F1', fontWeight: 'bold', fontSize: 16 },
    subtitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
    sectionHeader: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 32, marginBottom: 16 },
    calloutContainer: { width: 220, padding: 8 },
    calloutTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
    calloutInfo: { fontSize: 14, color: '#6366F1', fontWeight: '600', marginBottom: 6 },
    calloutDesc: { fontSize: 14, color: '#475569', marginBottom: 12, lineHeight: 20 },
    calloutAction: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    cardSubject: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    cardInfo: { fontSize: 15, color: '#475569', marginTop: 4, lineHeight: 22 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    participantCount: { fontSize: 14, color: '#6366F1', fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontSize: 16, fontStyle: 'italic' },
    fab: { position: 'absolute', bottom: 40, right: 25, backgroundColor: '#6366F1', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    fabText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },
    logoutButton: { marginTop: 20, padding: 16, alignItems: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#EF4444' },
    logoutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
    
    tabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 16 },
    tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    tabButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    tabText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
    tabTextActive: { color: '#0F172A' },
    joinedBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
    joinedBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }
});