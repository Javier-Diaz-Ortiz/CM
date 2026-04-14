import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { auth } from '../services/firebase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/home');
        } catch (error) {
            Alert.alert('Error de acceso', error.message);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <View style={styles.formContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>¡Hola de nuevo! 👋</Text>
                    <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Correo electrónico</Text>
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

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                    <Text style={styles.primaryButtonText}>Entrar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkContainer}>
                    <Text style={styles.linkBaseText}>¿No tienes cuenta? <Text style={styles.linkText}>Regístrate aquí</Text></Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center' },
    formContainer: { padding: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#64748B' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 16, fontSize: 16, color: '#0F172A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    primaryButton: { backgroundColor: '#6366F1', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    linkContainer: { marginTop: 24, alignItems: 'center' },
    linkBaseText: { color: '#64748B', fontSize: 15 },
    linkText: { color: '#6366F1', fontWeight: 'bold' }
});