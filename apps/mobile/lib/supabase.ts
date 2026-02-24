import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// MMKV-based storage adapter for Supabase auth
function createMmkvStorage() {
  try {
    const { createMMKV } = require("react-native-mmkv");
    const mmkv = createMMKV({ id: "supabase-auth" });
    return {
      getItem: (key: string): string | null => {
        return mmkv.getString(key) ?? null;
      },
      setItem: (key: string, value: string): void => {
        mmkv.set(key, value);
      },
      removeItem: (key: string): void => {
        mmkv.remove(key);
      },
    };
  } catch {
    // Fallback for Expo Go: in-memory storage
    const store = new Map<string, string>();
    return {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
      removeItem: (key: string): void => {
        store.delete(key);
      },
    };
  }
}

const mmkvStorage = createMmkvStorage();

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: mmkvStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error("Supabaseクライアントの初期化に失敗しました:", error);
  }
} else {
  console.error(
    "Supabase環境変数が設定されていません。\n" +
      "EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください。"
  );
}

export { supabase };
