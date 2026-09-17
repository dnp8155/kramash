import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const activeAppId = appId || import.meta.env.VITE_BASE44_APP_ID;
const activeToken = token || import.meta.env.VITE_BASE44_API_KEY;

export const base44 = createClient({
  appId: activeAppId,
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});