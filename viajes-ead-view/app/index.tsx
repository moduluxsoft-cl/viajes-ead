// app/index.tsx
import React, { useEffect } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      if (role === 'student') {
        router.replace("/(student)");
      } else if (role === 'validator' || role === 'admin') {
        router.replace("/(validator)/scanner");
      }
    } else {
      router.replace("/(auth)/login");
    }
  }, [user, role, loading]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={{ marginTop: 20 }}>Cargando...</Text>
    </View>
  );
}
