import { useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function CreateSession() {
    const [subject, setSubject] = useState('');
    const [location, setLocation] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const router = useRouter();

    const handleCreate = async () => {
        if (!subject || !location || !time) {
            Alert.alert("Error", "Por favor rellena los campos principales");
            return;
        }

        try {
            await addDoc(collection(db, 'study_sessions'), {
                subject,
                location,
                time,
                description,
                creatorEmail: auth.currentUser.email,
                creatorId: auth.currentUser.uid,
                createdAt: new Date().toISOString(),
            });
            Alert.alert("¡Éxito!", "Sesión de estudio publicada");
            router.replace('/home');
        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Crear Quedada</Text>
            
            <Text style={styles.label}>Asignatura / Tema</Text>
            <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Ej: Cálculo II" />

            <Text style={styles.label}>Lugar</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ej: Biblioteca Central" />

            <Text style={styles.label}>Hora</Text>
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="Ej: 17:30" />

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput 
                style={[styles.input, { height: 80 }]} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="Ej: Vamos a repasar el tema 3"
                multiline
            />

            <View style={{ marginTop: 10 }}>
                <Button title="Publicar" onPress={handleCreate} color="#34C759" />
                <View style={{ height: 10 }} />
                <Button title="Cancelar" onPress={() => router.back()} color="gray" />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, paddingTop: 50 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#fff' },
});