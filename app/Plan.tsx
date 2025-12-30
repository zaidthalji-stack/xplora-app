import React from "react";
import { View, Text } from "react-native";

export default function Plan({ t }: any) {
  const rawTodos = t?.toolInvocation?.args?.todos;
  const todos = Array.isArray(rawTodos)
    ? rawTodos
    : rawTodos
    ? [rawTodos]
    : [];

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Plan</Text>
      {todos.length === 0 ? (
        <Text>No todos found.</Text>
      ) : (
        todos.map((todo, i) => (
          <Text key={i}>
            {typeof todo === "string" ? todo : JSON.stringify(todo)}
          </Text>
        ))
      )}
    </View>
  );
}
