import { addDoc, collection, doc, updateDoc, deleteDoc, getDocs, orderBy, query, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Creates a new study session in Firestore.
 * @param {Object} sessionData - The session details.
 * @param {string} sessionData.title - Title of the session (e.g., "Cálculo II").
 * @param {string} sessionData.subject - Subject.
 * @param {string} sessionData.description - Description.
 * @param {string} sessionData.creatorId - ID of the user creating the session.
 * @param {string} sessionData.startTime - Start time (ISO string or valid date string).
 * @param {string} sessionData.endTime - End time (ISO string or valid date string).
 * @returns {Promise<string>} The ID of the created document.
 */
export const createSession = async (sessionData) => {
    try {
        const docRef = await addDoc(collection(db, 'sessions'), {
            title: sessionData.title,
            subject: sessionData.subject,
            description: sessionData.description,
            creatorId: sessionData.creatorId,
            participants: [sessionData.creatorId],
            maxParticipants: sessionData.maxParticipants || 10,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            location: sessionData.location || null,
            createdAt: new Date().toISOString(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding session to Firestore: ", error);
        throw error;
    }
};

/**
 * Retrieves all active sessions from Firestore.
 * @returns {Promise<Array>} Array of session objects.
 */
export const getActiveSessions = async () => {
    try {
        const sessionsQuery = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(sessionsQuery);

        const sessions = [];
        querySnapshot.forEach((doc) => {
            sessions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return sessions;
    } catch (error) {
        console.error("Error getting active sessions: ", error);
        throw error;
    }
};

/**
 * Suscribe a las sesiones activas en tiempo real.
 * @param {Function} callback - Función que recibe el array de sesiones actualizadas.
 * @returns {Function} Función para cancelar la suscripción (unsubscribe).
 */
export const subscribeToActiveSessions = (callback) => {
    try {
        const sessionsQuery = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(sessionsQuery, (querySnapshot) => {
            const sessions = [];
            querySnapshot.forEach((doc) => {
                sessions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(sessions);
        }, (error) => {
            console.error("Error subscribing to active sessions: ", error);
        });

        return unsubscribe;
    } catch (error) {
        console.error("Error setting up active sessions listener: ", error);
        throw error;
    }
};

export const seedDummyData = async (uid, lat, lon) => {
    try {
        const dummies = [
            {
                title: "Estudio Inteligencia Artificial",
                subject: "IA 101",
                description: "Repaso de árboles de decisión.",
                creatorId: uid,
                participants: [],
                startTime: new Date(Date.now() + 86400000).toISOString(),
                endTime: new Date(Date.now() + 90000000).toISOString(),
                location: { latitude: lat + 0.005, longitude: lon + 0.005 },
                createdAt: new Date().toISOString(),
            },
            {
                title: "Taller Mobile Computing",
                subject: "App Dev",
                description: "Repaso de mapas y rutas.",
                creatorId: uid,
                participants: [],
                startTime: new Date(Date.now() + 42400000).toISOString(),
                endTime: new Date(Date.now() + 50000000).toISOString(),
                location: { latitude: lat - 0.003, longitude: lon - 0.004 },
                createdAt: new Date().toISOString(),
            },
            {
                title: "Quedada Distribuidos",
                subject: "Sistemas Flexibles",
                description: "Cafetería y código duro.",
                creatorId: "dummy123",
                participants: [],
                startTime: new Date(Date.now() + 10400000).toISOString(),
                endTime: new Date(Date.now() + 15000000).toISOString(),
                location: { latitude: lat + 0.001, longitude: lon - 0.007 },
                createdAt: new Date().toISOString(),
            }
        ];
        for (const session of dummies) {
            await addDoc(collection(db, 'sessions'), session);
        }
        console.log("Mock data injected!");
    } catch (e) {
        console.error(e);
    }
};

export const joinSession = async (session, userId) => {
    const max = session.maxParticipants || 10;
    if (session.participants?.length >= max) {
        throw new Error("La sesión está llena.");
    }
    if (new Date() > new Date(session.startTime)) {
        throw new Error("La sesión ya ha empezado. No se admiten incorporaciones tardías.");
    }
    const sessionRef = doc(db, 'sessions', session.id);
    await updateDoc(sessionRef, { participants: arrayUnion(userId) });
};

export const leaveSession = async (sessionId, userId) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, { participants: arrayRemove(userId) });
};

export const deleteSession = async (sessionId) => {
    await deleteDoc(doc(db, 'sessions', sessionId));
};

export const sendMessage = async (sessionId, userId, userName, text) => {
    await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
        text,
        senderId: userId,
        senderName: userName,
        createdAt: new Date().toISOString()
    });
};

export const subscribeToMessages = (sessionId, callback) => {
    const q = query(collection(db, 'sessions', sessionId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const msgs = [];
        snapshot.forEach(d => msgs.push({ id: d.id, ...d.data() }));
        callback(msgs);
    });
};
