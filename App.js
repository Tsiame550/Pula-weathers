import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import WebSurface from './src/WebSurface';
import * as Location from './src/locationService';
import * as Notifications from './src/notificationService';
import { buildSceneHtml } from './src/sceneHtml';
import { getSceneForWeather } from './src/sceneMapping';
import { COUNTRIES, cityMatchesSearch } from './src/cities';
import {
  fetchWeather,
  formatTemperature,
  getFriendlyDate,
  getHour,
  getWeatherDescription
} from './src/weather';

import { getWeatherTheme } from './src/weatherTheme';
import { loadPreferences, savePreferences, saveForecastCache, getForecastCache, defaults } from './src/storage';
import { getForecastAdvisories, nearestPresetCity } from './src/insights';
import { Pulse, RainTimeline, AdvisoryPanel, ExtendedDetails, MapPage, FarmPage } from './src/FeatureSections';
import { TrafficPage, TravelPage } from './src/TrafficTravelScreens';
import { fetchAirQuality, fetchMapConditions } from './src/weather';

function showNotice(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

// Local notifications are a supplementary opt-in feature, not an official warning feed.
if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false})
});

const WeatherIcon = ({ code, size = 25, color = '#F7FBFF', isNight = false }) => (
  <Feather name={isNight && [0, 1].includes(Number(code)) ? 'moon' : getWeatherDescription(code).icon} size={size} color={color} />
);

function SectionHeading({ title, subtitle, styles }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function InfoTile({ icon, label, value, unit, note, styles, theme }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoTitleRow}>
        <Feather name={icon} size={16} color={theme.accent} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
        {unit ? <Text style={styles.infoUnit}>{unit}</Text> : null}
      </View>
      {note ? <Text style={styles.infoNote}>{note}</Text> : null}
    </View>
  );
}

export default function App() {
  const [selection, setSelection] = useState({ country: 'LS', cityId: 'ls-maseru' });
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadNumber, setReloadNumber] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [tab, setTab] = useState('weather');
  const [mapLayer, setMapLayer] = useState('temperature');
  const [mapData, setMapData] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapReload, setMapReload] = useState(0);
  const [airQuality, setAirQuality] = useState(null);
  const [airError, setAirError] = useState('');
  const [preferences, setPreferences] = useState(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const lastFetchStarted = useRef(0);
  const notificationPending = useRef('');
  const allCities = useMemo(() => Object.entries(COUNTRIES).flatMap(([countryCode, obj]) => obj.cities.map(item => ({...item, countryCode}))), []);

  const country = COUNTRIES[selection.country];
  const city = country.cities.find((c) => c.id === selection.cityId) || country.cities[0];
  const availableCities = useMemo(
    () => country.cities.filter((item) => cityMatchesSearch(item, citySearch)),
    [country, citySearch]
  );

  useEffect(() => {
    let active = true;
    loadPreferences().then(prefs => {
      if (!active) return;
      setPreferences(prefs);
      const valid = COUNTRIES[prefs.selection?.country]?.cities.some(item => item.id === prefs.selection.cityId);
      if (valid) setSelection(prefs.selection);
    }).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (hydrated) savePreferences({ ...preferences, selection }).catch(() => {});
  }, [selection.country, selection.cityId, preferences, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    lastFetchStarted.current = Date.now();
    const controller = new AbortController();
    let active = true;
    let receivedFresh = false;
    setLoading(true);
    setError('');
    // Cached forecast is displayed with a visible offline/stale label.
    getForecastCache(city.id).then(cache => {
      if (active && !receivedFresh && cache?.forecast) { setForecast(current => current || cache.forecast); setCachedAt(cache.cachedAt); }
    }).catch(() => {});
    fetchWeather(city, controller.signal)
      .then((data) => {
        if (active) { receivedFresh = true; setForecast(data); setCachedAt(null); saveForecastCache(city.id, data).catch(() => {}); }
      })
      .catch((reason) => {
        if (active && !controller.signal.aborted) {
          setError(reason?.message || 'Unable to load weather. Please try again.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [city.id, reloadNumber, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    setAirQuality(null);
    setAirError('');
    fetchAirQuality(city, controller.signal).then(setAirQuality).catch(e => {
      if (!controller.signal.aborted) setAirError(e.message || 'Air quality data unavailable.');
    });
    return () => controller.abort();
  }, [city.id, reloadNumber, hydrated]);

  useEffect(() => {
    if (!hydrated || tab !== 'map') return;
    const controller = new AbortController();
    setMapLoading(true); setMapError('');
    fetchMapConditions(allCities, controller.signal).then(setMapData).catch(e => {
      if (!controller.signal.aborted) setMapError(e.message || 'Map conditions unavailable.');
    }).finally(() => { if (!controller.signal.aborted) setMapLoading(false); });
    return () => controller.abort();
  }, [tab, mapReload, reloadNumber, hydrated]);

  useEffect(() => {
    if (Platform.OS === 'web' || !preferences.notificationsEnabled || !forecast || cachedAt || loading || error || !hydrated) return;
    const first = getForecastAdvisories(forecast).find(item => item.level === 'caution');
    if (!first) return;
    const date = String(forecast.current?.time || '').slice(0,10);
    const key = `${city.id}:${date}:${first.id}`;
    if (key === preferences.lastNotification || notificationPending.current === key) return;
    notificationPending.current = key;
    Notifications.scheduleNotificationAsync({
      content: { title: `PULA: ${first.title}`, body: `${city.name}: ${first.detail} Not an official weather alert.`, channelId: 'pula-risk' },
      trigger: null
    }).then(() => setPreferences(p => ({...p,lastNotification:key})))
      .catch(() => { notificationPending.current=''; });
  }, [forecast, city.id, cachedAt, loading, error, hydrated, preferences]);

  // Keep the scene accurate without asking users to manually change the weather.
  // Automatically refresh while open, and when returning after 15+ minutes.
  useEffect(() => {
    const refreshMs = 15 * 60 * 1000;
    const timer = setInterval(() => setReloadNumber((n) => n + 1), refreshMs);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && Date.now() - lastFetchStarted.current > refreshMs) {
        setReloadNumber((n) => n + 1);
      }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  async function useNearbyCity() {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.status !== 'granted') { showNotice('Location not allowed','You can still select a city manually.'); return; }
      const coords = (await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced})).coords;
      const nearby = nearestPresetCity(coords.latitude, coords.longitude, COUNTRIES);
      if (!nearby) { showNotice('Outside supported towns','Choose a city from Lesotho or South Africa.'); return; }
      switchToCity(nearby.id);
    } catch (e) { showNotice('Location unavailable', e.message || 'Select a city manually.'); }
  }

  async function toggleNotifications() {
    if (Platform.OS === 'web') {
      window.alert('Weather notifications are available in the Android app. Browser preview does not schedule alerts.');
      return;
    }
    if (preferences.notificationsEnabled) {
      setPreferences(p=>({...p,notificationsEnabled:false})); return;
    }
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) { showNotice('Notifications disabled','Allow notifications in Android settings to enable this optional feature.'); return; }
      await Notifications.setNotificationChannelAsync('pula-risk', {
        name:'Weather forecast guidance', importance:Notifications.AndroidImportance.DEFAULT
      });
      setPreferences(p=>({...p,notificationsEnabled:true}));
    } catch (_) { showNotice('Not available','Notification support may require a compatible app build.'); }
  }

  function toggleFavorite() {
    setPreferences(p => ({...p, favorites: p.favorites.includes(city.id) ? p.favorites.filter(id=>id!==city.id) : [...p.favorites,city.id] }));
  }
  function switchToCity(id) {
    const next=allCities.find(c=>c.id===id);
    if (!next) return;
    if (next.id === city.id) { setTab('weather'); return; }
    setForecast(null); setCachedAt(null);
    setSelection({country:next.countryCode,cityId:next.id});
    setTab('weather');
  }
  function changeCountry(code) {
    if (code === selection.country) return;
    setForecast(null); setCachedAt(null);
    setSelection({ country: code, cityId: COUNTRIES[code].cities[0].id });
    setCitySearch('');
  }

  function chooseCity(chosenCity) {
    setPickerVisible(false);
    setCitySearch('');
    if (chosenCity.id !== city.id) {
      setForecast(null); setCachedAt(null);
      setSelection({ ...selection, cityId: chosenCity.id });
    }
  }

  const current = forecast?.current;
  const scene = getSceneForWeather(current);
  const sceneHtml = useMemo(() => buildSceneHtml(scene), [scene.condition, scene.isNight]);
  const weather = getWeatherDescription(current?.weather_code);
  const theme = useMemo(() => getWeatherTheme(scene), [scene.condition, scene.isNight]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const moodColor = theme.heroIcon;
  const COLORS = theme;
  const formatValue = (value) => typeof value === 'number' ? String(Math.round(value)) : '—';
  const subtitleTime = current?.time?.slice(11, 16) || '--:--';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBarStyle} />
      <ScrollView
        contentContainerStyle={styles.main}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(loading && forecast)}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
            onRefresh={() => setReloadNumber((value) => value + 1)}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}><Feather name="sun" size={23} color={COLORS.accentInk} /></View>
            <View>
              <Text style={styles.brandName}>PULA<Text style={{ color: COLORS.accent }}>.</Text></Text>
              <Text style={styles.brandCaption}>WEATHER · TRAFFIC · TRAVEL</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.circleButton}
            accessibilityLabel="Refresh weather"
            accessibilityRole="button"
            onPress={() => setReloadNumber((value) => value + 1)}
          >
            <Feather name="refresh-cw" size={19} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.eyebrow}>YOUR DAILY WEATHER</Text>
            <Text style={styles.introTitle}>The day, simplified.</Text>
          </View>
        </View>

        <View style={styles.countrySwitch}>
          {['LS', 'ZA'].map((code) => (
            <TouchableOpacity
              key={code}
              style={[styles.countryTab, code === selection.country && styles.countryTabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: code === selection.country }}
              onPress={() => changeCountry(code)}
            >
              <Text style={[styles.countryText, code === selection.country && styles.countryTextActive]}>
                {code === 'LS' ? 'Lesotho' : 'South Africa'}
              </Text>
              <Text style={[styles.countryCode, code === selection.country && styles.countryCodeActive]}>{code === 'ZA' ? 'SA' : 'LS'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.locationBar}
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Choose city, currently ${city.name}`}
        >
          <View style={styles.locationLeft}>
            <Feather name="map-pin" size={19} color={COLORS.accent} />
            <View>
              <Text style={styles.locationOverline}>SELECTED LOCATION</Text>
              <Text style={styles.locationName}>{city.name}, {country.name}</Text>
            </View>
          </View>
          <Feather name="chevron-down" size={19} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={preferences.favorites.includes(city.id) ? 'Remove saved city' : 'Save this city'}>
            <Feather name="star" size={16} color={COLORS.accent}/>
            <Text style={styles.actionText}>{preferences.favorites.includes(city.id)?'Saved':'Save city'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={useNearbyCity} style={styles.actionButton} accessibilityRole="button" accessibilityLabel="Find nearest preset city">
            <Feather name="navigation" size={16} color={COLORS.accent}/>
            <Text style={styles.actionText}>Near me</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoriteScroll} contentContainerStyle={{gap:8}}>
          {preferences.favorites.map(id=>{
            const found=allCities.find(c=>c.id===id);
            return found ? <TouchableOpacity key={id} style={[styles.favoriteChip,found.id===city.id&&styles.favoriteChipActive]} onPress={()=>switchToCity(id)}>
              <Text style={{color:found.id===city.id?COLORS.accentInk:COLORS.white,fontWeight:'700',fontSize:11}}>{found.name}</Text>
            </TouchableOpacity> : null;
          })}
        </ScrollView>
        <View style={styles.tabBar}>
          {[['weather','Weather','cloud'],['traffic','Traffic','activity'],['travel','Travel','navigation'],['map','Map','map-pin'],['farm','Farm','feather']].map(([id,label,icon])=>
            <TouchableOpacity key={id} onPress={()=>setTab(id)} style={[styles.appTab,tab===id&&styles.appTabActive]} accessibilityRole="button" accessibilityState={{selected:tab===id}}>
              <Feather name={icon} size={15} color={tab===id?COLORS.accentInk:COLORS.muted}/>
              <Text style={[styles.appTabText,tab===id&&styles.appTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          )}
        </View>

        {tab === 'traffic' ? <TrafficPage city={city} theme={theme} refreshToken={reloadNumber} /> : tab === 'travel' ? <TravelPage city={{...city,countryCode:selection.country,countryName:country.name}} theme={theme} refreshToken={reloadNumber}/> : loading && !forecast ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Getting {city.name}'s latest forecast…</Text>
          </View>
        ) : error && !forecast ? (
          <View style={styles.errorPanel}>
            <Feather name="wifi-off" size={30} color={COLORS.danger} />
            <Text style={styles.errorTitle}>We couldn't reach the forecast.</Text>
            <Text style={styles.errorCaption}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setReloadNumber((value) => value + 1)}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : forecast ? (
          <>
            {tab==='map' ? <MapPage theme={theme} points={mapData} loading={mapLoading} error={mapError}
              layer={mapLayer} setLayer={setMapLayer} selectedId={city.id} onSelect={switchToCity}
              onReload={()=>setMapReload(n=>n+1)}/> : null}
            {tab==='farm' ? <FarmPage forecast={forecast} theme={theme}/> : null}
            {tab==='weather' ? <>
            {error ? <Text style={styles.inlineError}>Could not refresh. Showing the last forecast.</Text> : null}
            <View style={styles.hero}>

              <View style={styles.heroTop}>
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveLabel}>LATEST CONDITIONS</Text>
                </View>
                <Text style={styles.heroTime}>Updated {subtitleTime}</Text>
              </View>
              <View style={styles.heroTemperatureRow}>
                <Text style={styles.heroTemp}>{formatValue(current?.temperature_2m)}</Text>
                <Text style={styles.heroDegree}>°C</Text>
                <View style={styles.heroWeatherIcon}>
                  <WeatherIcon code={current?.weather_code} size={53} color={moodColor} isNight={scene.isNight} />
                </View>
              </View>
              <Text style={styles.heroCondition}>{weather.title}</Text>
              <Text style={styles.heroCity}>{city.name}, {country.name}</Text>
              <View
                style={styles.sceneFrame}
                pointerEvents="none"
                accessibilityLabel={`Animated ${scene.condition} weather scene ${scene.isNight ? 'at night' : 'during the day'}`}
              >
                <WebSurface
                  title={`Animated ${scene.condition} weather`}
                  key={`${city.id}-${scene.condition}-${scene.isNight}`}
                  source={{ html: sceneHtml }}
                  originWhitelist={['*']}
                  scrollEnabled={false}
                  javaScriptEnabled
                  domStorageEnabled={false}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  overScrollMode="never"
                  style={styles.sceneWebView}
                  accessible={false}
                />
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroFooter}>
                <View style={styles.highLowRow}>
                  <Feather name="arrow-up" size={16} color={moodColor} />
                  <Text style={styles.highLowText}>H: {formatTemperature(forecast.today.high)}</Text>
                  <Feather name="arrow-down" size={16} color={COLORS.muted} />
                  <Text style={styles.highLowText}>L: {formatTemperature(forecast.today.low)}</Text>
                </View>
                <Feather name="arrow-up-right" size={20} color={moodColor} />
              </View>
            </View>

            {cachedAt ? <Text style={styles.staleBanner}>Offline forecast saved {new Date(cachedAt).toLocaleString()}. It may be outdated.</Text> : null}
            <Pulse forecast={forecast} cityName={city.name} theme={theme}/>
            <RainTimeline forecast={forecast} theme={theme}/>
            <AdvisoryPanel forecast={forecast} countryCode={selection.country} cityId={city.id} theme={theme}
              notificationsEnabled={preferences.notificationsEnabled} onToggleNotifications={toggleNotifications}/>
            <SectionHeading styles={styles} title="Weather details" subtitle="Right now" />
            <View style={styles.metricsGrid}>
              <InfoTile styles={styles} theme={theme} icon="thermometer" label="FEELS LIKE" value={formatValue(current?.apparent_temperature)} unit="°C" note="Perceived temperature" />
              <InfoTile styles={styles} theme={theme} icon="droplet" label="HUMIDITY" value={formatValue(current?.relative_humidity_2m)} unit="%" note="Relative humidity" />
              <InfoTile styles={styles} theme={theme} icon="wind" label="WIND SPEED" value={formatValue(current?.wind_speed_10m)} unit="km/h" note="Near-surface wind" />
              <InfoTile styles={styles} theme={theme} icon="cloud-rain" label="RAIN CHANCE" value={formatValue(forecast.today.rainChance)} unit="%" note="Highest chance today" />
            </View>

            <ExtendedDetails forecast={forecast} airQuality={airQuality} airError={airError} theme={theme}/>
            <SectionHeading styles={styles} title="Next 12 hours" subtitle="Hourly outlook" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.hoursScroll}
              contentContainerStyle={styles.hoursContent}
            >
              {forecast.hourly.map((hour, index) => (
                <View style={[styles.hourCard, index === 0 && styles.hourCardActive]} key={hour.time}>
                  <Text style={[styles.hourTime, index === 0 && styles.hourTextActive]}>{index === 0 ? 'Now' : getHour(hour.time)}</Text>
                  <WeatherIcon code={hour.weatherCode} size={24} color={index === 0 ? COLORS.accentInk : COLORS.accent} />
                  <Text style={[styles.hourTemp, index === 0 && styles.hourTextActive]}>{formatTemperature(hour.temp)}</Text>
                  <View style={styles.rainRow}>
                    <Feather name="droplet" size={11} color={index === 0 ? COLORS.accentInk : COLORS.rain} />
                    <Text style={[styles.rainChance, index === 0 && styles.hourTextActive]}>{formatValue(hour.rainChance)}%</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <SectionHeading styles={styles} title="7-day forecast" subtitle="Plan the week ahead" />
            <View style={styles.dailyPanel}>
              {forecast.daily.map((day, index) => (
                <View key={day.date} style={[styles.dailyRow, index !== forecast.daily.length - 1 && styles.dailyDivider]}>
                  <Text style={[styles.dayName, index === 0 && styles.todayText]}>{getFriendlyDate(day.date, index)}</Text>
                  <View style={styles.dayIconGroup}>
                    <WeatherIcon code={day.weatherCode} size={21} color={COLORS.accent} />
                    <Text style={styles.dailyRain}>{formatValue(day.rainChance)}%</Text>
                  </View>
                  <Text style={styles.dayLow}>{formatTemperature(day.low)}</Text>
                  <View style={styles.tempTrack}>
                    <View style={[styles.tempTrackInner, { width: `${Math.max(10, Math.min(100, 50 + ((Number(day.high) || 20) - (Number(day.low) || 10)) * 3))}%` }]} />
                  </View>
                  <Text style={styles.dayHigh}>{formatTemperature(day.high)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sunCard}>
              <View style={styles.sunEntry}>
                <Feather name="sunrise" size={22} color={COLORS.accent} />
                <View><Text style={styles.sunLabel}>SUNRISE</Text><Text style={styles.sunValue}>{forecast.today.sunrise?.slice(11, 16) || '—'}</Text></View>
              </View>
              <View style={styles.sunSeparator} />
              <View style={styles.sunEntry}>
                <Feather name="sunset" size={22} color={COLORS.accent} />
                <View><Text style={styles.sunLabel}>SUNSET</Text><Text style={styles.sunValue}>{forecast.today.sunset?.slice(11, 16) || '—'}</Text></View>
              </View>
            </View>
            </> : null}
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerWordmark}>PULA<Text style={{ color: COLORS.accent }}>.</Text></Text>
          <Text style={styles.footerCaption}>Weather: Open-Meteo · Traffic & routing when connected: TomTom</Text>
          <Text style={styles.footerCaption}>Forecasts and traffic reports may be incomplete. Not official warnings.</Text>
        </View>
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setPickerVisible(false)} accessibilityLabel="Close city picker" />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTop}>
              <View>
                <Text style={styles.sheetTitle}>Choose a city</Text>
                <Text style={styles.sheetSubtitle}>Showing cities in {country.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeButton} accessibilityLabel="Close">
                <Feather name="x" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputRow}>
              <Feather name="search" size={18} color={COLORS.muted} />
              <TextInput
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder="Search for a city"
                placeholderTextColor={theme.muted}
                style={styles.searchInput}
                selectionColor={COLORS.accent}
                autoCorrect={false}
              />
              {citySearch ? <TouchableOpacity onPress={() => setCitySearch('')}><Feather name="x-circle" size={17} color={COLORS.muted} /></TouchableOpacity> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.citiesList}>
              {availableCities.length === 0 ? <Text style={styles.emptyText}>No matching city in this list.</Text> : null}
              {availableCities.map((item) => (
                <TouchableOpacity key={item.id} style={styles.cityItem} onPress={() => chooseCity(item)}>
                  <View style={styles.cityItemLeft}>
                    <Feather name="map-pin" size={17} color={COLORS.muted} />
                    <Text style={[styles.cityItemText, city.id === item.id && { color: COLORS.accent }]}>{item.name}</Text>
                  </View>
                  {city.id === item.id ? <Feather name="check" size={20} color={COLORS.accent} /> : <Feather name="chevron-right" size={17} color={COLORS.muted} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  main: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 35 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 22, fontWeight: '900', color: COLORS.white, letterSpacing: 1.1 },
  brandCaption: { fontSize: 8, fontWeight: '700', letterSpacing: 2.0, color: COLORS.muted, marginTop: 2 },
  circleButton: { width: 41, height: 41, borderRadius: 15, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  greetingRow: { marginBottom: 21 },
  eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 7 },
  introTitle: { color: COLORS.white, fontSize: 27, letterSpacing: -0.8, fontWeight: '700' },
  countrySwitch: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 5, marginBottom: 16, gap: 5 },
  countryTab: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  countryTabActive: { backgroundColor: COLORS.accent },
  countryText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  countryTextActive: { color: COLORS.accentInk },
  countryCode: { color: COLORS.muted, fontSize: 10, fontWeight: '900' },
  countryCodeActive: { color: COLORS.accentInk },
  actionRow: {flexDirection:'row', gap:9, marginBottom:11},
  actionButton: {backgroundColor:COLORS.card,paddingVertical:11,paddingHorizontal:14,borderRadius:12,flexDirection:'row',alignItems:'center',gap:8},
  actionText: {color:COLORS.white,fontWeight:'700',fontSize:12},
  favoriteScroll:{marginBottom:13},
  favoriteChip:{backgroundColor:COLORS.card,paddingVertical:9,paddingHorizontal:13,borderRadius:20},
  favoriteChipActive:{backgroundColor:COLORS.accent},
  tabBar:{flexDirection:'row',padding:5,backgroundColor:COLORS.card,borderRadius:16,marginBottom:16,gap:5},
  appTab:{flex:1,minHeight:55,borderRadius:12,flexDirection:'column',justifyContent:'center',alignItems:'center',gap:5},
  appTabActive:{backgroundColor:COLORS.accent},
  appTabText:{color:COLORS.muted,fontSize:10,fontWeight:'700'},
  appTabTextActive:{color:COLORS.accentInk},
  staleBanner:{backgroundColor:COLORS.card,color:COLORS.danger,padding:12,borderRadius:12,marginTop:12},
  locationBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 17, marginBottom: 17 },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1 },
  locationOverline: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.3, fontWeight: '700', marginBottom: 4 },
  locationName: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  loadingWrap: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 20 },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  errorPanel: { padding: 28, backgroundColor: COLORS.card, borderRadius: 22, alignItems: 'center', gap: 12 },
  errorTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  errorCaption: { color: COLORS.muted, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  retryButton: { backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  retryText: { color: COLORS.accentInk, fontWeight: '800' },
  inlineError: { color: COLORS.danger, paddingVertical: 10 },
  hero: { backgroundColor: COLORS.hero, borderRadius: 26, padding: 24, overflow: 'hidden', minHeight: 475 },
  sceneFrame: { height: 204, marginHorizontal: -24, marginTop: 18, overflow: 'hidden', backgroundColor: COLORS.sceneBg },
  sceneWebView: { flex: 1, backgroundColor: 'transparent' },
  heroHalo: { position: 'absolute', width: 234, height: 234, borderRadius: 117, backgroundColor: COLORS.cardLight, right: -84, top: -57 },
  heroHaloSmall: { position: 'absolute', width: 142, height: 142, borderRadius: 71, backgroundColor: COLORS.line, right: -28, top: -17, opacity: 0.7 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { height: 7, width: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  liveLabel: { color: COLORS.heroMuted, fontWeight: '800', fontSize: 10, letterSpacing: 1.1 },
  heroTime: { color: COLORS.heroMuted, fontSize: 10 },
  heroTemperatureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, height: 107 },
  heroTemp: { color: COLORS.heroText, fontSize: 97, fontWeight: '300', letterSpacing: -6, lineHeight: 111 },
  heroDegree: { color: COLORS.heroText, fontSize: 25, fontWeight: '600', marginLeft: 4, marginTop: 15 },
  heroWeatherIcon: { marginLeft: 'auto', marginRight: 9, marginTop: 13 },
  heroCondition: { color: COLORS.heroText, fontSize: 22, fontWeight: '700', marginTop: 6 },
  heroCity: { color: COLORS.heroMuted, fontSize: 13, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: COLORS.heroMuted, marginTop: 24, marginBottom: 15, opacity: 0.65 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  highLowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  highLowText: { color: COLORS.heroText, fontSize: 13, fontWeight: '700', marginRight: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 29, marginBottom: 14 },
  sectionTitle: { color: COLORS.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  sectionSubtitle: { color: COLORS.muted, fontSize: 11 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  infoTile: { width: '48.3%', padding: 18, backgroundColor: COLORS.card, borderRadius: 19, minHeight: 125 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  infoValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 15 },
  infoValue: { color: COLORS.white, fontSize: 29, fontWeight: '700', letterSpacing: -0.5 },
  infoUnit: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  infoNote: { color: COLORS.muted, fontSize: 10, marginTop: 5 },
  hoursScroll: { marginHorizontal: -22 },
  hoursContent: { paddingHorizontal: 22, gap: 10 },
  hourCard: { backgroundColor: COLORS.card, borderRadius: 18, minWidth: 76, paddingHorizontal: 12, paddingVertical: 17, alignItems: 'center', gap: 15 },
  hourCardActive: { backgroundColor: COLORS.accent },
  hourTime: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  hourTextActive: { color: COLORS.accentInk },
  hourTemp: { color: COLORS.white, fontWeight: '800', fontSize: 21 },
  rainRow: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  rainChance: { color: COLORS.rain, fontWeight: '700', fontSize: 10 },
  dailyPanel: { backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 6 },
  dailyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 8 },
  dailyDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  dayName: { color: COLORS.white, fontSize: 13, fontWeight: '600', width: 77 },
  todayText: { color: COLORS.accent, fontWeight: '800' },
  dayIconGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 67 },
  dailyRain: { color: COLORS.rain, fontSize: 10, fontWeight: '700' },
  dayLow: { color: COLORS.muted, fontSize: 13, fontWeight: '700', width: 31, textAlign: 'right' },
  tempTrack: { height: 4, backgroundColor: COLORS.track, borderRadius: 4, flex: 1, overflow: 'hidden' },
  tempTrackInner: { backgroundColor: COLORS.accent, height: 4, borderRadius: 4 },
  dayHigh: { color: COLORS.white, fontSize: 13, fontWeight: '800', width: 33, textAlign: 'right' },
  sunCard: { backgroundColor: COLORS.card, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 15, paddingVertical: 20 },
  sunEntry: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  sunSeparator: { backgroundColor: COLORS.line, width: 1, height: 40 },
  sunLabel: { color: COLORS.muted, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  sunValue: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginTop: 4 },
  footer: { alignItems: 'center', gap: 6, marginTop: 36 },
  footerWordmark: { color: COLORS.white, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  footerCaption: { color: COLORS.footer, fontSize: 10, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalDismiss: { flex: 1 },
  sheet: { backgroundColor: COLORS.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 25, height: '73%' },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.muted, marginBottom: 22 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 },
  sheetTitle: { color: COLORS.white, fontWeight: '800', fontSize: 22 },
  sheetSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
  closeButton: { width: 35, height: 35, borderRadius: 12, backgroundColor: COLORS.cardLight, alignItems: 'center', justifyContent: 'center' },
  searchInputRow: { height: 48, borderRadius: 14, backgroundColor: COLORS.cardLight, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, marginBottom: 14 },
  searchInput: { color: COLORS.white, flex: 1, fontSize: 14, paddingVertical: 8 },
  citiesList: { flex: 1 },
  cityItem: { minHeight: 57, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  cityItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  cityItemText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 22, textAlign: 'center' }
});
