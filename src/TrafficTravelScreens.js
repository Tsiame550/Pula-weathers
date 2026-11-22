import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Linking,Modal,ScrollView,Text,TextInput,TouchableOpacity,View} from 'react-native';
import { Feather } from '@expo/vector-icons';
import WebSurface from './WebSurface';
import { COUNTRIES } from './cities';
import {fetchWeather} from './weather';
import {BACKEND_URL,configured,fetchTraffic,fetchRoute,externalDirectionsUrl,getTripWeatherAdvice} from './trafficTravel';
import {trafficMapHtml,routeMapHtml} from './trafficMapHtml';

const ALL = Object.entries(COUNTRIES).flatMap(([countryCode, obj])=>obj.cities.map(c=>({...c,countryCode,countryName:obj.name})));
const findCity=id=>ALL.find(c=>c.id===id);
function Panel({theme,children,style}){return <View style={[{backgroundColor:theme.card,padding:18,borderRadius:20,marginBottom:13},style]}>{children}</View>;}
function Title({theme,pre,children}){return <View style={{marginTop:12,marginBottom:17}}><Text style={{fontSize:10,letterSpacing:1.7,fontWeight:'800',color:theme.accent}}>{pre}</Text><Text style={{fontSize:27,color:theme.white,fontWeight:'900',marginTop:6,letterSpacing:-.8}}>{children}</Text></View>;}
function Status({theme,connected}){return <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:7,height:7,borderRadius:5,backgroundColor:connected?'#4baa82':theme.muted}}/><Text style={{fontSize:11,fontWeight:'700',color:theme.muted}}>{connected?'CONNECTED LIVE DATA':'LIVE DATA NOT CONNECTED'}</Text></View>;}
function SmallButton({onPress,icon,children,theme}){return <TouchableOpacity onPress={onPress} accessibilityRole="button" style={{paddingHorizontal:14,paddingVertical:12,backgroundColor:theme.cardLight,borderRadius:13,flexDirection:'row',alignItems:'center',gap:7,alignSelf:'flex-start'}}><Feather name={icon} size={14} color={theme.accent}/><Text style={{color:theme.white,fontWeight:'700',fontSize:12}}>{children}</Text></TouchableOpacity>;}
function fmtTime(seconds){if(typeof seconds!=='number')return '—';const m=Math.round(seconds/60);return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m} min`;}

export function TrafficPage({city,theme,refreshToken}){
  const [state,setState]=useState({connected:false,incidents:[],fetchedAt:null});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [manual,setManual]=useState(0);
  useEffect(()=>{
    const ac=new AbortController();let active=true;
    setState({connected:false,incidents:[],fetchedAt:null});setError('');
    if(!configured())return ()=>ac.abort();
    setBusy(true);
    fetchTraffic(city,ac.signal).then(data=>{if(active)setState(data);}).catch(err=>{if(active&&!ac.signal.aborted)setError(err.message||'Traffic not available.');}).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;ac.abort();};
  },[city.id,refreshToken,manual]);
  const map=useMemo(()=>trafficMapHtml(city,state.incidents,state.connected,BACKEND_URL),[city.id,state.connected,state.incidents]);
  return <>
    <Title pre="REAL-WORLD ROADS · SA + LS" theme={theme}>Traffic near you.</Title>
    <Panel theme={theme}>
      <Status theme={theme} connected={state.connected}/>
      <Text style={{fontSize:23,color:theme.white,fontWeight:'900',marginTop:14}}>{city.name}</Text>
      <Text style={{fontSize:12,color:theme.muted,marginTop:7,lineHeight:19}}>{state.connected?'TomTom-reported road incidents and flow layer. Not every road or event may have data.':'Map is available. Add a PULA traffic backend to enable live congestion colors and incident reports.'}</Text>
      {state.connected&&state.fetchedAt?<Text style={{color:theme.muted,fontSize:10,marginTop:9}}>Fetched {new Date(state.fetchedAt).toLocaleTimeString()}</Text>:null}
    </Panel>
    <View style={{height:390,borderRadius:19,overflow:'hidden',backgroundColor:theme.cardLight,marginBottom:12}}>
      <WebSurface key={`${city.id}:${state.connected}`} source={{html:map}} originWhitelist={['*']} javaScriptEnabled scrollEnabled style={{flex:1,backgroundColor:theme.cardLight}} />
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
      <Text style={{fontSize:11,color:theme.muted}}>Base map: OpenStreetMap · Traffic: TomTom</Text>
      <SmallButton onPress={()=>setManual(n=>n+1)} icon="refresh-cw" theme={theme}>Refresh</SmallButton>
    </View>
    {busy?<Text style={{color:theme.muted,marginBottom:13}}>Checking road reports…</Text>:null}
    {error?<Text style={{color:theme.danger,marginBottom:13}}>{error}</Text>:null}
    <Text style={{fontWeight:'800',fontSize:18,color:theme.white,marginBottom:12}}>Road incident reports</Text>
    {state.connected&&state.incidents.length===0?<Panel theme={theme}><Text style={{color:theme.white,fontWeight:'700'}}>No incidents returned in this search area.</Text><Text style={{color:theme.muted,fontSize:12,marginTop:6}}>This does not guarantee that roads are clear or safe.</Text></Panel>:null}
    {!state.connected?<Panel theme={theme}><Feather name="link-2" color={theme.accent} size={22}/><Text style={{color:theme.white,fontWeight:'800',marginTop:10}}>Connect live traffic</Text><Text style={{color:theme.muted,fontSize:12,lineHeight:19,marginTop:6}}>The Android app requires a deployed PULA API proxy configured with TomTom credentials. No traffic readings are simulated.</Text></Panel>:null}
    {state.incidents.map((incident,i)=><Panel theme={theme} key={incident.id||i}>
      <View style={{flexDirection:'row',gap:9,alignItems:'center'}}><Feather name="alert-circle" size={19} color={theme.accent}/><Text style={{color:theme.white,fontWeight:'800',flex:1}}>{incident.category}</Text></View>
      <Text style={{color:theme.white,marginTop:9,fontSize:13,lineHeight:20}}>{incident.description}</Text>
      {incident.road?<Text style={{color:theme.muted,marginTop:7,fontSize:11}}>{incident.road}</Text>:null}
      {incident.delaySeconds!==null?<Text style={{color:theme.muted,marginTop:6,fontSize:11}}>Reported incident delay: {fmtTime(incident.delaySeconds)}</Text>:null}
    </Panel>)}
    <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>Traffic data may be delayed, incomplete or unavailable. Always follow road signs and official instructions.</Text>
  </>;
}

export function TravelPage({city,theme,refreshToken}){
  const [fromId,setFromId]=useState(city.id);
  const [toId,setToId]=useState(city.countryCode==='LS'?'za-bloemfontein':'ls-maseru');
  const [pick,setPick]=useState(null);
  const [query,setQuery]=useState('');
  const [route,setRoute]=useState(null), [routeError,setRouteError]=useState(''),[routeBusy,setRouteBusy]=useState(false);
  const [destForecast,setDestForecast]=useState(null),[weatherError,setWeatherError]=useState('');
  useEffect(()=>{setFromId(city.id);},[city.id]);
  const origin=findCity(fromId)||city, destination=findCity(toId)||ALL[0];
  const same=origin.id===destination.id;
  useEffect(()=>{
    const ac=new AbortController(), active={ok:true};
    setRoute(null);setRouteError('');setRouteBusy(false);
    if(same||!configured())return ()=>{active.ok=false;ac.abort();};
    setRouteBusy(true);
    fetchRoute(origin,destination,ac.signal).then(data=>{if(active.ok)setRoute(data);}).catch(e=>{if(active.ok&&!ac.signal.aborted)setRouteError(e.message||'Route unavailable.');}).finally(()=>{if(active.ok)setRouteBusy(false);});
    return ()=>{active.ok=false;ac.abort();};
  },[fromId,toId,refreshToken]);
  useEffect(()=>{
    const ac=new AbortController(),active={ok:true};
    setDestForecast(null);setWeatherError('');
    fetchWeather(destination,ac.signal).then(data=>{if(active.ok)setDestForecast(data);}).catch(e=>{if(active.ok&&!ac.signal.aborted)setWeatherError('Destination weather unavailable.');});
    return ()=>{active.ok=false;ac.abort();};
  },[toId,refreshToken]);
  const map=useMemo(()=>routeMapHtml(origin,destination,route?.points||[]),[fromId,toId,route]);
  function openDirections(){Linking.openURL(externalDirectionsUrl(origin,destination)).catch(()=>{});}
  const filtered=ALL.filter(c=>(c.name+' '+c.countryName).toLowerCase().includes(query.toLowerCase()));
  function selectCity(id){if(pick==='from')setFromId(id);else setToId(id);setQuery('');setPick(null);}
  return <>
    <Title pre="DRIVE SMARTER · CROSS-BORDER TRIPS" theme={theme}>Plan a journey.</Title>
    <Panel theme={theme}>
      <Text style={{color:theme.muted,fontSize:11,letterSpacing:1,fontWeight:'700'}}>START</Text>
      <TouchableOpacity onPress={()=>setPick('from')} style={{paddingVertical:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:9}}><Feather name="circle" color={theme.accent} size={18}/><Text style={{color:theme.white,fontSize:18,fontWeight:'800'}}>{origin.name}</Text></View><Feather name="chevron-down" color={theme.muted} size={19}/>
      </TouchableOpacity>
      <View style={{height:1,backgroundColor:theme.line,marginVertical:4}}/>
      <Text style={{color:theme.muted,fontSize:11,letterSpacing:1,fontWeight:'700',marginTop:13}}>DESTINATION</Text>
      <TouchableOpacity onPress={()=>setPick('to')} style={{paddingVertical:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:9}}><Feather name="map-pin" color={theme.accent} size={18}/><Text style={{color:theme.white,fontSize:18,fontWeight:'800'}}>{destination.name}</Text></View><Feather name="chevron-down" color={theme.muted} size={19}/>
      </TouchableOpacity>
      <Text style={{color:theme.muted,fontSize:11,marginTop:4}}>{origin.countryName} → {destination.countryName}</Text>
      {same?<Text style={{color:theme.danger,marginTop:10}}>Choose two different cities.</Text>:null}
    </Panel>
    <Panel theme={theme}>
      <Status theme={theme} connected={Boolean(route)}/>
      <View style={{flexDirection:'row',marginTop:14,gap:12}}>
        <View style={{flex:1}}><Text style={{color:theme.muted,fontSize:11}}>DRIVING TIME</Text><Text style={{color:theme.white,fontSize:25,fontWeight:'900',marginTop:7}}>{route?fmtTime(route.travelMinutes*60):'—'}</Text></View>
        <View style={{flex:1}}><Text style={{color:theme.muted,fontSize:11}}>ROAD DISTANCE</Text><Text style={{color:theme.white,fontSize:25,fontWeight:'900',marginTop:7}}>{route?`${Math.round(route.distanceKm)} km`:'—'}</Text></View>
      </View>
      {route?.trafficDelayMinutes!==null&&route?<Text style={{color:theme.muted,fontSize:12,marginTop:11}}>Estimated traffic delay: {route.trafficDelayMinutes} min</Text>:null}
      <Text style={{color:theme.muted,fontSize:11,lineHeight:18,marginTop:12}}>{route?'TomTom traffic-aware routing estimate, retrieved just now. Check again before departure.':'No road travel time or route is shown until live routing is connected. Select the navigation link to plan in Google Maps.'}</Text>
      {routeBusy?<Text style={{color:theme.muted,marginTop:8}}>Checking roads and traffic…</Text>:null}
      {routeError?<Text style={{color:theme.danger,marginTop:8}}>{routeError}</Text>:null}
    </Panel>
    <View style={{height:315,borderRadius:19,overflow:'hidden',backgroundColor:theme.cardLight,marginBottom:14}}>
      <WebSurface source={{html:map}} originWhitelist={['*']} javaScriptEnabled scrollEnabled style={{flex:1,backgroundColor:theme.cardLight}} />
    </View>
    {!route?<Text style={{color:theme.muted,fontSize:11,lineHeight:17,marginBottom:11}}>Pins show the two cities. They do not represent a road route. Connect routing to display actual road geometry.</Text>:null}
    <TouchableOpacity onPress={openDirections} disabled={same} style={{borderRadius:15,backgroundColor:theme.accent,padding:17,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:9,opacity:same ? 0.5 : 1}}>
      <Feather name="navigation" size={18} color={theme.accentInk}/><Text style={{color:theme.accentInk,fontSize:14,fontWeight:'900'}}>Open driving directions</Text>
    </TouchableOpacity>
    <Text style={{color:theme.muted,fontSize:10,marginTop:8,marginBottom:17}}>Opens Google Maps (external app or browser). Google Maps controls navigation and its travel estimates.</Text>
    <Text style={{color:theme.white,fontWeight:'800',fontSize:19,marginBottom:13}}>Weather at your destination</Text>
    <Panel theme={theme}>
      <Text style={{color:theme.white,fontWeight:'900',fontSize:18}}>{destination.name}</Text>
      <Text style={{color:theme.accent,fontSize:29,fontWeight:'900',marginTop:10}}>{destForecast?.current?.temperature_2m!=null?`${Math.round(destForecast.current.temperature_2m)}°C`:'—'}</Text>
      {getTripWeatherAdvice(destForecast,destination.name).map((message,i)=><View key={i} style={{flexDirection:'row',gap:7,marginTop:10}}><Feather name="info" size={14} color={theme.accent}/><Text style={{flex:1,fontSize:12,color:theme.white,lineHeight:18}}>{message}</Text></View>)}
      {weatherError?<Text style={{fontSize:12,color:theme.danger,marginTop:10}}>{weatherError}</Text>:null}
      <Text style={{color:theme.muted,marginTop:14,fontSize:10}}>Destination forecast only, NOT a forecast for roads along the journey.</Text>
    </Panel>
    {origin.countryCode!==destination.countryCode?<Panel theme={theme}><View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Feather name="globe" color={theme.accent} size={19}/><Text style={{color:theme.white,fontWeight:'800'}}>Cross-border journey</Text></View><Text style={{color:theme.muted,fontSize:12,lineHeight:19,marginTop:7}}>Check current identification, immigration, vehicle documents and border-post operating hours with official authorities before travel. PULA does not verify border wait times or requirements.</Text></Panel>:null}
    <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>Trip planning is informational. Follow official road notices and real-world road conditions.</Text>
    <Modal visible={Boolean(pick)} transparent animationType="slide" onRequestClose={()=>setPick(null)}><View style={{flex:1,backgroundColor:'rgba(0,0,0,.65)',justifyContent:'flex-end'}}>
      <TouchableOpacity style={{flex:1}} onPress={()=>setPick(null)} accessibilityLabel="Close list"/>
      <View style={{height:'74%',backgroundColor:theme.sheet,borderTopLeftRadius:27,borderTopRightRadius:27,padding:22}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:12}}><Text style={{color:theme.white,fontSize:21,fontWeight:'900'}}>Choose {pick==='from'?'start':'destination'}</Text><TouchableOpacity onPress={()=>setPick(null)}><Feather name="x" color={theme.white} size={21}/></TouchableOpacity></View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search South Africa or Lesotho" placeholderTextColor={theme.muted} style={{backgroundColor:theme.card,color:theme.white,padding:13,borderRadius:12,marginBottom:12}}/>
        <ScrollView keyboardShouldPersistTaps="handled">{filtered.map(c=><TouchableOpacity key={c.id} onPress={()=>selectCity(c.id)} style={{paddingVertical:14,borderBottomWidth:1,borderColor:theme.line}}><Text style={{color:theme.white,fontWeight:'700',fontSize:14}}>{c.name}</Text><Text style={{color:theme.muted,fontSize:11,marginTop:2}}>{c.countryName}</Text></TouchableOpacity>)}</ScrollView>
      </View></View></Modal>
  </>;
}
