import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { auth } from '../services/firebase';
import { createSession } from '../services/sessions';

export default function CreateSession() {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [maxParticipants, setMaxParticipants] = useState('10');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const [pickerState, setPickerState] = useState({ visible: false, mode: 'date', target: 'start' });

    const openPicker = (target, mode) => {
        setPickerState({ visible: true, mode, target });
    };

    const handleDateChange = (event, selectedDate) => {
        setPickerState(prev => ({ ...prev, visible: Platform.OS === 'ios' }));
        if (!selectedDate) return;

        if (pickerState.target === 'start') {
            const currentDate = new Date(startDate);
            if (pickerState.mode === 'date') {
                currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            } else {
                currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            }
            setStartDate(currentDate);
        } else {
            const currentDate = new Date(endDate);
            if (pickerState.mode === 'date') {
                currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            } else {
                currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            }
            setEndDate(currentDate);
        }
    };
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    const handleCreate = async () => {
        // Validación básica de campos vacíos
        if (!title.trim() || !subject.trim() || !description.trim()) {
            Alert.alert("Campos incompletos", "Por favor, rellena todos los campos.");
            return;
        }

        const max = parseInt(maxParticipants, 10);
        if (isNaN(max) || max < 1) {
            Alert.alert("Capacidad inválida", "Indica un aforo numérico válido.");
            return;
        }

        // Validación de fecha
        const start = startDate;
        const end = endDate;
        const now = new Date();

        if (start < now) {
            Alert.alert("Fecha inválida", "La hora de inicio no puede ser en el pasado.");
            return;
        }

        if (end <= start) {
            Alert.alert("Fecha inválida", "La hora de fin debe ser posterior a la hora de inicio.");
            return;
        }

        setIsLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Error", "Debes estar logueado para crear una sesión.");
                setIsLoading(false);
                return;
            }

            let location = null;
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let currentPos = await Location.getCurrentPositionAsync({});
                location = {
                    latitude: currentPos.coords.latitude,
                    longitude: currentPos.coords.longitude
                };
            } else {
                Alert.alert("Permiso denegado", "No se guardará la ubicación de la sesión.");
            }

            await createSession({
                title: title.trim(),
                subject: subject.trim(),
                description: description.trim(),
                creatorId: user.uid,
                maxParticipants: max,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                location: location
            });

            Alert.alert("¡Listo!", "Tu sesión de estudio ha sido publicada correctamente.");
            router.replace('/home');
        } catch (error) {
            console.error("Error al crear sesión:", error);
            Alert.alert("Error", "No se pudo publicar la sesión: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
                <Text style={styles.title}>Nueva Sesión de Estudio</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Ej: Cálculo II - Primer Parcial"
                        editable={!isLoading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Asignatura</Text>
                    <TextInput
                        style={styles.input}
                        value={subject}
                        onChangeText={setSubject}
                        placeholder="Ej: Análisis Matemático"
                        editable={!isLoading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ej: Repaso de integrales dobles y triples. Traed los apuntes."
                        multiline
                        numberOfLines={4}
                        editable={!isLoading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Capacidad Máxima (Aforo)</Text>
                    <TextInput
                        style={styles.input}
                        value={maxParticipants}
                        onChangeText={setMaxParticipants}
                        keyboardType="numeric"
                        editable={!isLoading}
                        placeholder="Ej: 10"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Inicio</Text>
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => openPicker('start', 'date')} disabled={isLoading}>
                            <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => openPicker('start', 'time')} disabled={isLoading}>
                            <Text style={styles.dateText}>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Fin</Text>
                    <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => openPicker('end', 'date')} disabled={isLoading}>
                            <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.datePickerBtn} onPress={() => openPicker('end', 'time')} disabled={isLoading}>
                            <Text style={styles.dateText}>{endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {pickerState.visible && (
                    <DateTimePicker
                        value={pickerState.target === 'start' ? startDate : endDate}
                        mode={pickerState.mode}
                        is24Hour={true}
                        display="default"
                        onChange={handleDateChange}
                    />
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.publishButton, isLoading && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Crear Sesión</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                        disabled={isLoading}
                    >
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
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    datePickerBtn: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DDD',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        color: '#1C1E21',
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
    buttonDisabled: {
        backgroundColor: '#95DFa5',
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