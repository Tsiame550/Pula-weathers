import React, { useState } from 'react';
import { Modal, Platform, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import WebSurface from './WebSurface';

export default function MapExplorer({ html, theme, title='Explore map', height=320, onMessage }) {
  const [expanded, setExpanded] = useState(false);
  const common = {source: {html}, originWhitelist: ['*'], javaScriptEnabled: true, scrollEnabled: false,
    showsVerticalScrollIndicator: false, showsHorizontalScrollIndicator: false, bounces: false,
    onMessage};
  return <>
    <View style={{height, backgroundColor:theme.cardLight, borderRadius:19, overflow:'hidden', marginBottom:10}}>
      {!expanded ? <WebSurface {...common} pointerEvents="none" style={{flex:1,backgroundColor:theme.cardLight,pointerEvents:'none'}} /> : null}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open full-screen ${title}`} onPress={()=>setExpanded(true)}
        style={{position:'absolute',bottom:13,right:13,paddingHorizontal:14,paddingVertical:11,borderRadius:12,backgroundColor:'#183d34',flexDirection:'row',alignItems:'center',gap:8}}>
        <Feather name="maximize" color="#fff" size={16}/><Text style={{color:'#fff',fontSize:12,fontWeight:'800'}}>Explore full screen</Text>
      </TouchableOpacity>
    </View>
    <Modal visible={expanded} animationType="slide" onRequestClose={()=>setExpanded(false)} presentationStyle="fullScreen">
      <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
        <View style={{backgroundColor:theme.background,paddingHorizontal:15,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <View style={{flex:1}}><Text style={{fontSize:17,fontWeight:'900',color:theme.white}} numberOfLines={1}>{title}</Text>
            <Text style={{fontSize:11,color:theme.muted,marginTop:3}}>Drag to move · Pinch to zoom · Search towns · Road / Satellite</Text></View>
          <TouchableOpacity onPress={()=>setExpanded(false)} accessibilityLabel="Close full-screen map" accessibilityRole="button" style={{backgroundColor:theme.card,padding:11,borderRadius:12}}>
            <Feather name="x" size={22} color={theme.white}/>
          </TouchableOpacity>
        </View>
        <View style={{flex:1,backgroundColor:theme.cardLight}}>
          <WebSurface {...common} onMessage={event=>{if(onMessage)onMessage(event);try {const message=JSON.parse(event.nativeEvent.data);if(message.type==='select-city')setExpanded(false);}catch(_){}}}
            style={{flex:1,backgroundColor:theme.cardLight}} />
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
