import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.titleLine}>Nueva Sesión</Text>
                    <TouchableOpacity onPress={() => router.push('/profile')} style={styles.iconButton}>
                        <Ionicons name="person-circle" size={32} color="#6366F1" />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Ej: Cálculo II - Primer Parcial"
                        editable={!isLoading}
                        placeholderTextColor="#94A3B8"
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
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ej: Repaso de integrales dobles y triples."
                        multiline
                        numberOfLines={4}
                        editable={!isLoading}
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Capacidad Máxima</Text>
                    <TextInput
                        style={styles.input}
                        value={maxParticipants}
                        onChangeText={setMaxParticipants}
                        keyboardType="numeric"
                        editable={!isLoading}
                        placeholder="Ej: 10"
                        placeholderTextColor="#94A3B8"
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
                            <Text style={styles.buttonText}>Publicar Sesión</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}
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
        backgroundColor: '#F8FAFC',
    },
    container: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    titleLine: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    iconButton: {
        width: 44,
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        color: '#0F172A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 16,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    datePickerBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    dateText: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
    },
    actions: {
        marginTop: 24,
    },
    publishButton: {
        backgroundColor: '#10B981',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#A7F3D0',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        marginTop: 16,
        padding: 16,
        alignItems: 'center',
    },
    cancelText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '600',
    },
});