import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { deleteSession, joinSession, leaveSession, sendMessage, subscribeToMessages } from '../../services/sessions';

export default function SessionDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [participantsInfo, setParticipantsInfo] = useState([]);
    const [messages, setMessages] = useState([]);
    const [textMsg, setTextMsg] = useState("");
    const [loading, setLoading] = useState(true);

    const user = auth.currentUser;

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'sessions', id), async (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setSession(data);

                if (data.participants && data.participants.length > 0) {
                    const pInfo = [];
                    for (const uid of data.participants) {
                        try {
                            const uSnap = await getDoc(doc(db, 'users', uid));
                            if (uSnap.exists()) {
                                const uData = uSnap.data();
                                pInfo.push({
                                    id: uid,
                                    name: uData.name || (uData.email ? uData.email.split('@')[0] : "Alumno"),
                                    photoURL: uData.photoURL || null
                                });
                            } else {
                                pInfo.push({ id: uid, name: "Alumno", photoURL: null });
                            }
                        } catch (e) {
                            pInfo.push({ id: uid, name: "Desconocido", photoURL: null });
                        }
                    }
                    setParticipantsInfo(pInfo);
                } else {
                    setParticipantsInfo([]);
                }
            } else {
                Alert.alert("Error", "La sesión ha sido eliminada.");
                router.canGoBack() ? router.back() : router.replace('/home');
            }
            setLoading(false);
        });

        const unsubMsgs = subscribeToMessages(id, (msgs) => setMessages(msgs));

        return () => {
            unsubscribe();
            unsubMsgs();
        };
    }, [id]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
    if (!session) return <View style={styles.center}><Text>Sesión no encontrada</Text></View>;

    const isJoined = session.participants?.includes(user?.uid);
    const isCreator = session.creatorId === user?.uid;
    const isFull = session.participants?.length >= (session.maxParticipants || 10);
    const hasStarted = new Date() > new Date(session.startTime);

    const handleJoin = async () => {
        try {
            await joinSession(session, user.uid);
        } catch (e) {
            Alert.alert("No pudimos unirte", e.message);
        }
    };

    const handleLeave = async () => {
        Alert.alert("Abandonar", "¿Seguro que quieres salir de la quedada?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Salir", style: "destructive", onPress: async () => {
                    await leaveSession(id, user.uid);
                }
            }
        ]);
    };

    const handleDelete = async () => {
        Alert.alert("Eliminar", "¿Estás seguro de que quieres cancelar esta sesión? Esta acción es irreversible.", [
            { text: "No", style: 'cancel' },
            {
                text: "Sí, borrar", style: 'destructive', onPress: async () => {
                    await deleteSession(id);
                    router.canGoBack() ? router.back() : router.replace('/home');
                }
            }
        ]);
    };

    const handleSend = async () => {
        if (!textMsg.trim()) return;
        try {
            const name = user.displayName || user?.email?.split('@')[0] || "Alumno";
            await sendMessage(id, user.uid, name, textMsg);
            setTextMsg("");
        } catch (e) { 
            console.error(e);
            Alert.alert("Mensaje no enviado", "Parece que no tienes conexión. Inténtalo de nuevo.");
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={styles.container} keyboardVerticalOffset={80}>
            <FlatList
                ListHeaderComponent={
                    <View style={styles.headerCard}>
                        <Text style={styles.title}>{session.title}</Text>
                        <Text style={styles.subject}>{session.subject}</Text>
                        <Text style={styles.desc}>{session.description}</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.time}>🕒 {new Date(session.startTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</Text>
                            <Text style={styles.time}> a {new Date(session.endTime).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>

                        <Text style={styles.partTitle}>Asistentes ({session.participants?.length || 0}/{session.maxParticipants || 10})</Text>
                        <View style={styles.usersBox}>
                            {participantsInfo.length > 0 ? (
                                <View style={styles.participantsContainer}>
                                    {participantsInfo.map((p, index) => (
                                        <View key={p.id || index} style={styles.participantChip}>
                                            {p.photoURL ? (
                                                <Image source={{ uri: p.photoURL }} style={styles.participantAvatar} />
                                            ) : (
                                                <View style={styles.participantPlaceholder}>
                                                    <Ionicons name="person" size={14} color="#999" />
                                                </View>
                                            )}
                                            <Text style={styles.participantName}>{p.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.partList}>Nadie aún...</Text>
                            )}
                        </View>

                        <View style={styles.actions}>
                            {isJoined ? (
                                <TouchableOpacity style={styles.btnLeave} onPress={handleLeave}>
                                    <Text style={styles.btnText}>Abandonar Quedada</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.btnJoin, (isFull || hasStarted) && styles.btnDisabled]}
                                    onPress={handleJoin}
                                    disabled={isFull || hasStarted}
                                >
                                    <Text style={styles.btnText}>{hasStarted ? 'Ya Empezada' : isFull ? 'Completa' : 'Unirse ahora'}</Text>
                                </TouchableOpacity>
                            )}

                            {isCreator && (
                                <TouchableOpacity style={styles.btnDelete} onPress={handleDelete}>
                                    <Text style={styles.btnText}>Cancelar Quedada</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                }
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isMe = item.senderId === user.uid;
                    return (
                        <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
                            {!isMe && <Text style={styles.msgName}>{item.senderName}</Text>}
                            <View style={[styles.msgBubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                                <Text style={isMe ? styles.msgTextRight : styles.msgTextLeft}>{item.text}</Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <Text style={styles.emptyChat}>No hay mensajes en el chat aún.</Text>
                }
                contentContainerStyle={{ padding: 15 }}
            />

            {isJoined ? (
                <View style={styles.chatInputRow}>
                    <TextInput
                        style={styles.input}
                        value={textMsg}
                        onChangeText={setTextMsg}
                        placeholder="Escribe en el chat..."
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                        <Text style={styles.sendText}>Enviar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.chatBlocked}>
                    <Text style={{ color: '#666', textAlign: 'center' }}>Únete para interactuar con los demás en el chat.</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
    title: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
    subject: { fontSize: 16, color: '#6366F1', fontWeight: '800', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
    desc: { fontSize: 16, color: '#475569', marginBottom: 20, lineHeight: 24 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    time: { fontSize: 15, color: '#64748B', fontWeight: '600' },
    partTitle: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    usersBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    partList: { fontSize: 14, color: '#64748B', fontStyle: 'italic' },
    participantsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    participantChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 6, paddingRight: 12, borderRadius: 24, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1, borderColor: '#E2E8F0' },
    participantAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
    participantPlaceholder: { width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    participantName: { fontSize: 13, color: '#0F172A', fontWeight: 'bold' },
    actions: { flexDirection: 'column', gap: 12, marginTop: 10 },
    btnJoin: { backgroundColor: '#10B981', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    btnLeave: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    btnDelete: { backgroundColor: '#EF4444', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    btnDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
    btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    msgWrapper: { marginBottom: 16, maxWidth: '85%', minWidth: 60, flexShrink: 1 },
    msgLeft: { alignSelf: 'flex-start' },
    msgRight: { alignSelf: 'flex-end' },
    msgName: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 4, marginLeft: 8 },
    msgBubble: { padding: 14, borderRadius: 20 },
    bubbleLeft: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#E2E8F0' },
    bubbleRight: { backgroundColor: '#6366F1', borderBottomRightRadius: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
    msgTextLeft: { color: '#0F172A', fontSize: 15, lineHeight: 22 },
    msgTextRight: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
    emptyChat: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontStyle: 'italic', fontSize: 15 },
    chatInputRow: { flexDirection: 'row', padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F1F5F9', paddingBottom: Platform.OS === 'ios' ? 25 : 16 },
    input: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginRight: 12, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', color: '#0F172A' },
    sendBtn: { justifyContent: 'center', backgroundColor: '#6366F1', paddingHorizontal: 20, borderRadius: 24, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
    sendText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    chatBlocked: { padding: 20, backgroundColor: '#F8FAFC', alignItems: 'center', borderTopWidth: 1, borderColor: '#E2E8F0', paddingBottom: Platform.OS === 'ios' ? 30 : 20 }
});
