import React, { useMemo } from 'react';
import { Linking, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import WebSurface from './WebSurface';
import MapExplorer from './MapExplorer';
import { buildMapHtml } from './mapHtml';
import { findRainWindow, getForecastAdvisories, getDailyBriefing, getFarmInsights, aqiLabel } from './insights';
import { getHour } from './weather';

const val = v => typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—';
const decimal = v => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—';

function Heading({ children, sub, theme }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 13 }}>
    <Text style={{ fontSize: 19, fontWeight: '800', color: theme.white }}>{children}</Text>
    {sub ? <Text style={{ fontSize: 11, color: theme.muted }}>{sub}</Text> : null}
  </View>;
}
function Panel({ children, theme }) {
  return <View style={{ padding: 18, borderRadius: 19, backgroundColor: theme.card }}>{children}</View>;
}
function SmallTile({ icon, label, number, unit, theme }) {
  return <View style={{ width: '48%', borderRadius: 16, backgroundColor: theme.card, padding: 17, marginBottom: 10 }}>
    <Feather name={icon} size={18} color={theme.accent}/>
    <Text style={{ color: theme.muted, fontSize: 10, fontWeight: '700', marginTop: 10 }}>{label}</Text>
    <Text style={{ color: theme.white, fontSize: 23, fontWeight: '800', marginTop: 6 }}>{number}<Text style={{ fontSize: 12, fontWeight: '500' }}>{unit}</Text></Text>
  </View>;
}
export function Pulse({ forecast, cityName, theme }) {
  return <>
    <Heading sub="Personalized forecast" theme={theme}>PULA Pulse</Heading>
    <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 19, borderLeftColor: theme.accent, borderLeftWidth: 4 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <Feather name="zap" color={theme.accent} size={16}/>
        <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>YOUR DAY, EXPLAINED</Text>
      </View>
      <Text style={{ color: theme.white, lineHeight: 23, fontSize: 15 }}>{getDailyBriefing(forecast, cityName)}</Text>
      <Text style={{ color: theme.muted, fontSize: 11, marginTop: 12 }}>Based on forecast models. Actual weather may vary.</Text>
    </View>
  </>;
}
export function RainTimeline({ forecast, theme }) {
  const hours = (forecast.next24Hours || forecast.hourly || []).slice(0, 18);
  const rain = findRainWindow(hours);
  return <>
    <Heading sub="Next 18 hours" theme={theme}>Rainfall outlook</Heading>
    <Panel theme={theme}>
      <Text style={{ color: theme.white, fontSize: 13, lineHeight: 20 }}>{rain.text}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 20, gap: 9 }}>
        {hours.filter((_,i)=>i%2===0).map((hour) => {
          const chance = Math.min(100,Math.max(0,hour.rainChance ?? 0));
          return <View key={hour.time} style={{ width: 43, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ color: theme.white, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>{hour.rainChance === null || hour.rainChance === undefined ? '—' : `${chance}%`}</Text>
            <View style={{ width: 18, height: 57, backgroundColor: theme.cardLight, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' }}>
              <View style={{ backgroundColor: theme.accent, height: `${Math.max(3,chance)}%`, borderRadius: 6 }}/>
            </View>
            <Text style={{ color: theme.muted, fontSize: 10, marginTop: 8 }}>{getHour(hour.time)}</Text>
          </View>;
        })}
      </ScrollView>
      <Text style={{ color: theme.muted, fontSize: 10, lineHeight: 15, marginTop: 12 }}>Bars show forecast precipitation probability, not rainfall amount or radar.</Text>
    </Panel>
  </>;
}
export function AdvisoryPanel({ forecast, countryCode, cityId, theme, notificationsEnabled, onToggleNotifications }) {
  const advisories = getForecastAdvisories(forecast);
  const officialUrl = countryCode === 'ZA' ? 'https://www.weathersa.co.za/' : 'https://lesmet.gov.ls/';
  return <>
    <Heading sub="Forecast-based guidance" theme={theme}>Weather risk</Heading>
    <Panel theme={theme}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Feather name={advisories.length ? 'alert-triangle' : 'shield'} size={19} color={theme.accent}/>
        <Text style={{ flex: 1, color: theme.white, fontWeight: '800', fontSize: 15 }}>{advisories.length ? `${advisories.length} forecast heads-up${advisories.length>1?'s':''}` : 'No elevated risks identified'}</Text>
      </View>
      {advisories.length ? advisories.map(item => <View key={item.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: theme.line }}>
        <Text style={{ color: theme.white, fontWeight: '700' }}>{item.title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{item.detail}</Text>
      </View>) : <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>This model-based check is limited. It does not mean conditions are safe or that no official warning exists.</Text>}
      <TouchableOpacity onPress={() => Linking.openURL(officialUrl)} style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 14, paddingVertical: 10 }}>
        <Feather name="external-link" size={16} color={theme.accent}/>
        <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800' }}>Check official {countryCode==='ZA'?'SAWS':'Lesotho Meteorological Services'} warnings</Text>
      </TouchableOpacity>
      <Text style={{ color: theme.muted, fontSize: 10, lineHeight: 16, marginBottom: 10 }}>These are NOT official severe-weather warnings. PULA does not automatically ingest the national alert feeds.</Text>
      <TouchableOpacity onPress={onToggleNotifications} accessibilityRole="switch" accessibilityState={{checked:notificationsEnabled}} style={{ paddingVertical: 11, borderTopWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 9 }}><Text style={{ color: theme.white, fontWeight: '800' }}>Risk notifications</Text><Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{Platform.OS==='web'?'Android only — unavailable in browser':'Opt-in, while the app checks forecasts'}</Text></View>
        <Feather name={notificationsEnabled?'bell':'bell-off'} color={theme.accent} size={21}/>
      </TouchableOpacity>
    </Panel>
  </>;
}
export function ExtendedDetails({ forecast, airQuality, airError, theme }) {
  const hour = forecast.next24Hours?.[0] || forecast.hourly?.[0] || {};
  return <>
    <Heading sub="UV · air · visibility" theme={theme}>More conditions</Heading>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <SmallTile icon="sun" label="UV MAX TODAY" number={val(forecast.today?.uvMax)} unit=" index" theme={theme}/>
      <SmallTile icon="eye" label="VISIBILITY" number={hour.visibilityM == null ? '—' : decimal(hour.visibilityM/1000)} unit=" km" theme={theme}/>
      <SmallTile icon="activity" label="AIR QUALITY · US AQI" number={val(airQuality?.aqi)} unit="" theme={theme}/>
      <SmallTile icon="wind" label="PM2.5 · MODEL" number={decimal(airQuality?.pm25)} unit=" μg/m³" theme={theme}/>
    </View>
    <Text style={{ color: theme.muted, marginTop: 5, fontSize: 11 }}>Air quality: {airQuality ? aqiLabel(airQuality.aqi) : (airError ? 'Unavailable now' : 'Loading or unavailable')} · Modelled, not a local sensor measurement.</Text>
  </>;
}
export function MapPage({ theme, points, loading, error, selectedId, onSelect, onReload }) {
  // Metric and base-map switches live inside Leaflet, so map position never
  // jumps back to the start on each switch.
  const html = useMemo(() => buildMapHtml(points, 'temperature', selectedId), [points, selectedId]);
  return <>
    <Heading sub="Lesotho & South Africa" theme={theme}>Regional weather map</Heading>
    <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, marginBottom: 13 }}>
      Search Leribe, Maputsoe or another town; explore the map at full size to pan and zoom smoothly. Satellite imagery is a basemap, not live weather radar.
    </Text>
    <MapExplorer title="Regional weather map" html={html} theme={theme} height={385}
      onMessage={(event)=>{try {const msg=JSON.parse(event.nativeEvent.data);if(msg.type==='select-city'&&typeof msg.cityId==='string')onSelect(msg.cityId);}catch(_){}}}/>
    <TouchableOpacity onPress={onReload} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 8 }}>
      <Feather name="refresh-cw" color={theme.accent} size={15}/><Text style={{color:theme.accent,fontWeight:'700'}}>Refresh city readings</Text>
    </TouchableOpacity>
    {loading ? <Text style={{color:theme.muted,fontSize:12}}>Loading regional weather readings…</Text> : null}
    {error ? <Text style={{color:theme.danger,fontSize:12}}>{error}</Text> : null}
    <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>Map pins show modelled city readings, not continuous meteorological radar. Satellite imagery may have varying dates and resolution.</Text>
  </>;
}
export function FarmPage({ forecast, theme }) {
  const farm = getFarmInsights(forecast);
  if (!farm) return null;
  return <>
    <Heading sub="Modelled agricultural data" theme={theme}>Farm weather</Heading>
    <Panel theme={theme}>
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 8 }}><Feather name="feather" color={theme.accent} size={22}/><Text style={{ color: theme.white, fontSize: 16, fontWeight:'800' }}>Field outlook</Text></View>
      <Text style={{ color: theme.white, fontSize: 14, lineHeight: 21 }}>{farm.guidance}</Text>
      <Text style={{ color: theme.muted, fontSize: 11, marginTop: 10 }}>Indicative only. These are forecasts, not measurements on your farm.</Text>
    </Panel>
    <Heading sub="Today" theme={theme}>Soil and water</Heading>
    <View style={{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap'}}>
      <SmallTile icon="thermometer" label="SOIL SURFACE TEMP" number={val(farm.soilTemp)} unit="°C" theme={theme}/>
      <SmallTile icon="cloud-rain" label="EXPECTED RAINFALL" number={decimal(farm.forecastRainMm)} unit=" mm" theme={theme}/>
      <SmallTile icon="droplet" label="SOIL WATER · 0–7 CM" number={decimal(farm.soilMoisture)} unit=" m³/m³" theme={theme}/>
      <SmallTile icon="wind" label="REFERENCE ET₀" number={decimal(farm.et0Mm)} unit=" mm" theme={theme}/>
    </View>
    <Heading sub="Next three mornings" theme={theme}>Frost outlook</Heading>
    <Panel theme={theme}>
      <Text style={{ color: theme.white, fontWeight: '800', fontSize: 16 }}>{farm.frostRisk ? 'Possible cold / frost conditions' : 'No low-temperature indicator found'}</Text>
      <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>Based on forecast minimum temperature at your selected town. Local frost may occur even when the model indicates above-freezing temperatures.</Text>
    </Panel>
    <Heading sub="Daily totals" theme={theme}>7-day rainfall</Heading>
    <Panel theme={theme}>{forecast.daily.map((day,i) => <View key={day.date} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:i===6?0:1,borderColor:theme.line }}>
      <Text style={{color:theme.white}}>{i===0?'Today':day.date}</Text>
      <Text style={{color:theme.accent,fontWeight:'700'}}>{decimal(day.rainMm)} mm</Text>
    </View>)}</Panel>
    <Text style={{fontSize:11,color:theme.muted,marginTop:16,lineHeight:18}}>Not suitable on its own for pesticide scheduling, flood decisions, irrigation rates, or planting guarantees. Validate with field observations and official guidance.</Text>
  </>;
}
