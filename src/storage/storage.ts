import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveData(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('saveData failed', key, e);
  }
}

export async function loadData<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('loadData failed', key, e);
    return fallback;
  }
}