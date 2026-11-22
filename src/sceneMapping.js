/**
 * Transform the Open-Meteo WMO code and current conditions into the scene
 * states used by the bundled SVG animation. Nothing is simulated here.
 * The forecast's is_day value is for the selected city, not the phone.
 */
function getSceneForWeather(current) {
  if (!current || current.weather_code === undefined || current.weather_code === null) {
    return { condition: 'cloud', isNight: false };
  }
  const code = Number(current.weather_code);
  const temperature = Number(current.temperature_2m);
  const wind = Number(current.wind_speed_10m);
  const gusts = Number(current.wind_gusts_10m);
  const cloudCover = Number(current.cloud_cover);
  const isNight = current.is_day === 0 || current.is_day === false;

  if ([95, 96, 99].includes(code)) return { condition: 'storm', isNight };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'snow', isNight };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'rain', isNight };
  if ([45, 48].includes(code)) return { condition: 'fog', isNight };
  if ((Number.isFinite(wind) && wind >= 35) || (Number.isFinite(gusts) && gusts >= 45)) {
    return { condition: 'wind', isNight };
  }
  if ([2, 3].includes(code) || (Number.isFinite(cloudCover) && cloudCover >= 60)) {
    return { condition: 'cloud', isNight };
  }
  if (Number.isFinite(temperature) && temperature >= 30 && !isNight) {
    return { condition: 'hot', isNight };
  }
  return { condition: 'clear', isNight };
}
module.exports = { getSceneForWeather };
