const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	// If running on localhost/custom domain, clear any stored remote app_base_url that causes external redirects
	if (!isNode && (storage.getItem('base44_app_base_url')?.includes('base44.app') || storage.getItem('base44_app_base_url')?.includes('kramashah2025'))) {
		storage.removeItem('base44_app_base_url');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.BASE44_APP_ID || import.meta.env.VITE_BASE44_APP_ID || import.meta.env.BASE44_API_KEY }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.BASE44_FUNCTIONS_VERSION || import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: (!isNode && window?.location?.origin) ? window.location.origin : (import.meta.env.BASE44_APP_BASE_URL || import.meta.env.VITE_BASE44_APP_BASE_URL || '') }),
	}
}


export const appParams = {
	...getAppParams()
}