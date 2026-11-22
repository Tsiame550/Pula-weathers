const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const KEY = '@pula/v2/preferences';
const cacheKey = id => `@pula/v2/forecast/${id}`;
const defaults = { selection: { country: 'LS', cityId: 'ls-maseru' }, favorites: ['ls-maseru', 'za-johannesburg'], notificationsEnabled: false, lastNotification: '' };

async function loadPreferences() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...defaults,
      ...parsed,
      selection: parsed.selection && typeof parsed.selection === 'object' ? parsed.selection : defaults.selection,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : defaults.favorites
    };
  } catch (_) { return { ...defaults }; }
}
async function savePreferences(value) { await AsyncStorage.setItem(KEY, JSON.stringify(value)); }
async function saveForecastCache(cityId, forecast) { await AsyncStorage.setItem(cacheKey(cityId), JSON.stringify({ cachedAt: new Date().toISOString(), forecast })); }
async function getForecastCache(cityId) {
  try { const raw = await AsyncStorage.getItem(cacheKey(cityId)); return raw ? JSON.parse(raw) : null; }
  catch (_) { return null; }
}
module.exports = { loadPreferences, savePreferences, saveForecastCache, getForecastCache, defaults };
