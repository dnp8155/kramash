// React hook for the lightweight i18n layer.
// Returns a t(en) function bound to the current user's app language.
import { useAuth } from "@/lib/AuthContext";
import { getAppLanguage, translate } from "@/lib/i18n";

export function useT() {
  const { user } = useAuth();
  const lang = getAppLanguage(user);
  return (en) => translate(lang, en);
}

export function useLang() {
  const { user } = useAuth();
  return getAppLanguage(user);
}