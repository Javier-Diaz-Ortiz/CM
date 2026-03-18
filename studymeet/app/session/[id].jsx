import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
                            if (uSnap.exists() && uSnap.data().email) {
                                pInfo.push(uSnap.data().email.split('@')[0]);
                            } else {
                                pInfo.push("Alumno");
                            }
                        } catch (e) {
                            pInfo.push("Desconocido");
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
                    router.back();
                }
            }
        ]);
    };

    const handleSend = async () => {
        if (!textMsg.trim()) return;
        try {
            const name = user.email.split('@')[0];
            await sendMessage(id, user.uid, name, textMsg);
            setTextMsg("");
        } catch (e) { console.error(e); }
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
                            <Text style={styles.partList}>{participantsInfo.join(', ') || 'Nadie aún...'}</Text>
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
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2, shadowOpacity: 0.1, shadowRadius: 3 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1C1E21', marginBottom: 5 },
    subject: { fontSize: 16, color: '#007AFF', fontWeight: 'bold', marginBottom: 15 },
    desc: { fontSize: 16, color: '#333', marginBottom: 15, lineHeight: 22 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    time: { fontSize: 15, color: '#555', fontWeight: '500' },
    partTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 5, marginBottom: 10 },
    usersBox: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginBottom: 15 },
    partList: { fontSize: 14, color: '#444', fontStyle: 'italic' },
    actions: { flexDirection: 'column', gap: 10, marginTop: 10 },
    btnJoin: { backgroundColor: '#34C759', padding: 14, borderRadius: 10, alignItems: 'center' },
    btnLeave: { backgroundColor: '#FF9500', padding: 14, borderRadius: 10, alignItems: 'center' },
    btnDelete: { backgroundColor: '#FF3B30', padding: 14, borderRadius: 10, alignItems: 'center' },
    btnDisabled: { backgroundColor: '#ccc' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    msgWrapper: { marginBottom: 12, maxWidth: '85%' },
    msgLeft: { alignSelf: 'flex-start' },
    msgRight: { alignSelf: 'flex-end' },
    msgName: { fontSize: 12, color: '#888', marginBottom: 4, marginLeft: 5 },
    msgBubble: { padding: 12, borderRadius: 18 },
    bubbleLeft: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
    bubbleRight: { backgroundColor: '#007AFF', borderBottomRightRadius: 4, elevation: 1 },
    msgTextLeft: { color: '#333', fontSize: 15 },
    msgTextRight: { color: '#fff', fontSize: 15 },
    emptyChat: { textAlign: 'center', color: '#999', marginTop: 40, fontStyle: 'italic' },
    chatInputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', paddingBottom: Platform.OS === 'ios' ? 25 : 12 },
    input: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 15 },
    sendBtn: { justifyContent: 'center', backgroundColor: '#007AFF', paddingHorizontal: 18, borderRadius: 20 },
    sendText: { color: '#fff', fontWeight: 'bold' },
    chatBlocked: { padding: 20, backgroundColor: '#E9E9EB', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 30 : 20 }
});
