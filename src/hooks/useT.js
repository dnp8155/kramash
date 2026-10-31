// React hook for the lightweight i18n layer.
// Returns a t(en) function bound to the current user's app language.
// Works without an AuthProvider too (the embedded inquiry form on a website), where it falls back to English.
import { useOptionalAuth } from "@/lib/AuthContext";
import { getAppLanguage, translate } from "@/lib/i18n";

export function useT() {
  const user = useOptionalAuth()?.user;
  const lang = getAppLanguage(user);
  return (en) => translate(lang, en);
}

export function useLang() {
  const user = useOptionalAuth()?.user;
  return getAppLanguage(user);
}
