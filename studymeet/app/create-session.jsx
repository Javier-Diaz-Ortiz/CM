import { useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function CreateSession() {
    const [subject, setSubject] = useState('');
    const [location, setLocation] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const router = useRouter();

    const handleCreate = async () => {
        // Validación básica
        if (!subject || !location || !time) {
            Alert.alert("Campos incompletos", "Por favor, indica al menos la asignatura, el lugar y la hora.");
            return;
        }

        try {
            const user = auth.currentUser;
            
            await addDoc(collection(db, 'study_sessions'), {
                subject,
                location,
                time,
                description,
                creatorEmail: user.email,
                creatorId: user.uid,
                // Inicializamos con el creador ya dentro del grupo
                participants: [user.uid], 
                createdAt: new Date().toISOString(),
            });

            Alert.alert("¡Listo!", "Tu sesión de estudio ha sido publicada correctamente.");
            router.replace('/home');
        } catch (error) {
            console.error("Error al crear sesión:", error);
            Alert.alert("Error", "No se pudo publicar la sesión: " + error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.title}>Nueva Quedada</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Asignatura / Tema</Text>
                    <TextInput 
                        style={styles.input} 
                        value={subject} 
                        onChangeText={setSubject} 
                        placeholder="Ej: Análisis Matemático" 
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lugar / Biblioteca</Text>
                    <TextInput 
                        style={styles.input} 
                        value={location} 
                        onChangeText={setLocation} 
                        placeholder="Ej: Biblioteca de Informática" 
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hora de encuentro</Text>
                    <TextInput 
                        style={styles.input} 
                        value={time} 
                        onChangeText={setTime} 
                        placeholder="Ej: 16:00 - 18:00" 
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notas adicionales</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        value={description} 
                        onChangeText={setDescription} 
                        placeholder="Ej: Traed el boletín de ejercicios del tema 2"
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.publishButton} onPress={handleCreate}>
                        <Text style={styles.buttonText}>Publicar Quedada</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: '#F0F2F5',
    },
    container: {
        padding: 25,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#1C1E21',
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#4B4B4B',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DDD',
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    actions: {
        marginTop: 10,
    },
    publishButton: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        marginTop: 15,
        padding: 12,
        alignItems: 'center',
    },
    cancelText: {
        color: '#666',
        fontSize: 16,
    },
});