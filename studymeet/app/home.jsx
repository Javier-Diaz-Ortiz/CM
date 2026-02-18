import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {user ? (
                <>
                    <Text style={styles.title}>Welcome, {user.email}</Text>
                    <View style={styles.buttonContainer}>
                        <Button title="Logout" onPress={handleLogout} />
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.title}>StudyMeetApp</Text>
                    <View style={styles.buttonContainer}>
                        <Button title="Login" onPress={() => router.push("/login")} />
                        <View style={styles.spacer} />
                        <Button title="Register" onPress={() => router.push("/register")} />
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
    },
    buttonContainer: {
        width: "100%",
        maxWidth: 300,
    },
    spacer: {
        height: 10,
    },
});
