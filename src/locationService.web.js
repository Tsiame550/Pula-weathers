// Geolocation on localhost/HTTPS. Browser prompts when location is requested.
export const Accuracy = { Balanced: 3 };
export async function requestForegroundPermissionsAsync() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { status: 'denied' };
  // The subsequent geolocation call triggers the browser's actual permission prompt.
  if (navigator.permissions?.query) {
    try { const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'denied') return { status: 'denied' };
    } catch (_) {}
  }
  return { status: 'granted' };
}
export async function getCurrentPositionAsync() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw Error('Geolocation is not supported in this browser.');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({coords: { latitude: coords.latitude, longitude: coords.longitude }}),
      err => reject(Error(err.message || 'Location access was not granted.')),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  });
}
