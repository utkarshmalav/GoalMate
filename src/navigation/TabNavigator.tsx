import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import FitnessScreen from "../screens/FitnessScreen";
import StudyScreen from "../screens/StudyScreen";
import MoneyScreen from "../screens/MoneyScreen";
import HabitsScreen from "../screens/HabitsScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

const tabColors: Record<string, string> = {
  Fitness: colors.fit,
  Study: colors.study,
  Money: colors.money,
  Habits: colors.green,
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tabColors[route.name],
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: "rgba(16,18,26,0.95)",
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Fitness: "barbell-outline",
            Study: "book-outline",
            Money: "wallet-outline",
            Habits: "checkmark-circle-outline",
          };
          return (
            <Ionicons name={icons[route.name]} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen
        name="Fitness"
        component={FitnessScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Study"
        component={StudyScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Money"
        component={MoneyScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
