import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleRegister = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                createdAt: new Date().toISOString(),
            });

            router.replace('/home');
        } catch (error) {
            Alert.alert('Error de registro', error.message);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.replace('/home')}
            >
                <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.formContainer}>
                <View style={styles.header}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5', shadowColor: '#10B981' }]}>
                        <Ionicons name="sparkles" size={32} color="#10B981" />
                    </View>
                    <Text style={styles.title}>Crear cuenta.</Text>
                    <Text style={styles.subtitle}>Súmate a tus compañeros en segundos</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Correo electrónico</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="tu@email.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="key-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
                    <Text style={styles.primaryButtonText}>Registrarme</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkContainer}>
                    <Text style={styles.linkBaseText}>¿Ya tienes cuenta? <Text style={styles.linkText}>Inicia sesión</Text></Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center' },
    backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 24, zIndex: 10, width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    formContainer: { padding: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
    header: { marginBottom: 40, alignItems: 'center' },
    iconWrapper: { padding: 16, borderRadius: 24, marginBottom: 24, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 5 },
    title: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0F172A' },
    primaryButton: { flexDirection: 'row', backgroundColor: '#10B981', padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    linkContainer: { marginTop: 32, alignItems: 'center' },
    linkBaseText: { color: '#64748B', fontSize: 15 },
    linkText: { color: '#10B981', fontWeight: '800' }
});