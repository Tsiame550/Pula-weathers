// Browser preview deliberately does not schedule local alerts.
// PULA notifications require a compatible Android build.
export const AndroidImportance = { DEFAULT: 3 };
export function setNotificationHandler() {}
export async function requestPermissionsAsync() { return { granted: false }; }
export async function setNotificationChannelAsync() { throw Error('Android only'); }
export async function scheduleNotificationAsync() { throw Error('Android only'); }
