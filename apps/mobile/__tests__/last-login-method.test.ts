/**
 * 「直近で利用」ラベル用のログイン手法記録。
 * メールログインは成功したときだけ記録し、失敗では前回の記録を変えない。
 */
import { renderHook, act } from "@testing-library/react-native";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { loadLastLoginMethod, saveLastLoginMethod } from "../lib/lastLoginMethod";
import { supabase } from "../lib/supabase";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

jest.mock("../lib/google-auth", () => ({
  getRedirectUri: () => "swimhubtimer://auth/callback",
}));

const mockSignInWithPassword = supabase?.auth.signInWithPassword as jest.Mock;

describe("lastLoginMethod", () => {
  it("保存した手法を読み出せる", () => {
    saveLastLoginMethod("google");
    expect(loadLastLoginMethod()).toBe("google");
    saveLastLoginMethod("apple");
    expect(loadLastLoginMethod()).toBe("apple");
  });
});

describe("useEmailAuth - 直近で利用の記録", () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    saveLastLoginMethod("google");
  });

  it("メールログインに成功すると email を記録する", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    const { result } = await renderHook(() => useEmailAuth());
    await act(async () => {
      await result.current.signInWithEmail("user@example.com", "Password1!");
    });
    expect(loadLastLoginMethod()).toBe("email");
  });

  it("メールログインに失敗したら前回の記録を変えない", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    });
    const { result } = await renderHook(() => useEmailAuth());
    await act(async () => {
      await result.current.signInWithEmail("user@example.com", "wrong");
    });
    expect(loadLastLoginMethod()).toBe("google");
  });
});
