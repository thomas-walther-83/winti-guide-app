// Re-Export des React-Native-Alert auf nativen Plattformen (iOS/Android).
// Auf Web kommt die `.web.ts`-Variante zum Zug, weil react-native-web
// `Alert.alert` als No-Op implementiert (Buttons feuern nie).
export { Alert } from 'react-native';
