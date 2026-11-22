/**
 * Weather-reactive PULA color system.
 * Uses exactly the same weather scene mapping as the SVG: the palette and
 * animation cannot disagree about the selected city's conditions.
 * No guessed local clock times: isNight comes from Open-Meteo's is_day.
 */
const palettes = {
  clear: {
    background: '#EAF4ED', card: '#FBFFF9', cardLight: '#DDEDE3', line: '#D1E2D6',
    white: '#173B2F', muted: '#536F61', accent: '#276D4C', accentInk: '#FFFFFF',
    hero: '#C9E5D5', heroText: '#163E31', heroMuted: '#436F5C', heroIcon: '#B56722',
    rain: '#2D6B99', track: '#B0CDB9', sceneBg: '#A9D9CC', footer: '#61796E',
    sheet: '#F2F9F3', danger: '#A53737', statusBarStyle: 'dark-content'
  },
  hot: {
    background: '#FFF3E2', card: '#FFFDF7', cardLight: '#F9E5C8', line: '#EBD6B8',
    white: '#4B3323', muted: '#755D4A', accent: '#A35020', accentInk: '#FFFFFF',
    hero: '#F6D59B', heroText: '#4A2F1C', heroMuted: '#785233', heroIcon: '#A9510C',
    rain: '#2D6F9A', track: '#E0BE8B', sceneBg: '#E5C287', footer: '#907962',
    sheet: '#FFF7EA', danger: '#A53737', statusBarStyle: 'dark-content'
  },
  cloud: {
    background: '#E7F0F2', card: '#F9FCFD', cardLight: '#DAE8EB', line: '#CFDEE3',
    white: '#243F4B', muted: '#526D7B', accent: '#2C647D', accentInk: '#FFFFFF',
    hero: '#CCDFE5', heroText: '#254451', heroMuted: '#5C7884', heroIcon: '#457A97',
    rain: '#3679A7', track: '#A7C3CF', sceneBg: '#A4C4CE', footer: '#6D8994',
    sheet: '#F0F8F9', danger: '#9D3434', statusBarStyle: 'dark-content'
  },
  rain: {
    background: '#0C2229', card: '#19343E', cardLight: '#254651', line: '#35545E',
    white: '#F3FAFC', muted: '#B2CBD0', accent: '#8DD5E4', accentInk: '#103038',
    hero: '#214755', heroText: '#F4FAFC', heroMuted: '#C5DEE4', heroIcon: '#B2E9F3',
    rain: '#9CDAF6', track: '#365968', sceneBg: '#254A54', footer: '#9FB8BE',
    sheet: '#14313A', danger: '#FFBFB3', statusBarStyle: 'light-content'
  },
  storm: {
    background: '#111727', card: '#222B42', cardLight: '#303A55', line: '#3D4763',
    white: '#F6F4FF', muted: '#B7BCD4', accent: '#D4C0FF', accentInk: '#211B39',
    hero: '#303653', heroText: '#FBF9FF', heroMuted: '#D1CEE7', heroIcon: '#E7CBFF',
    rain: '#AEC5FF', track: '#515875', sceneBg: '#2E3651', footer: '#A5ADC7',
    sheet: '#1A2338', danger: '#FFBAC1', statusBarStyle: 'light-content'
  },
  snow: {
    background: '#EDF5FA', card: '#FFFFFF', cardLight: '#DBEAF3', line: '#CFE0EA',
    white: '#213E54', muted: '#587487', accent: '#306E91', accentInk: '#FFFFFF',
    hero: '#D5E9F5', heroText: '#1F465E', heroMuted: '#577A91', heroIcon: '#367CA4',
    rain: '#367CA4', track: '#B6D2E3', sceneBg: '#C6DFEB', footer: '#6E8C9B',
    sheet: '#F5FBFE', danger: '#9B333B', statusBarStyle: 'dark-content'
  },
  wind: {
    background: '#E6F0E7', card: '#FBFFFA', cardLight: '#D8E8DB', line: '#CCE0D0',
    white: '#244333', muted: '#587964', accent: '#36734F', accentInk: '#FFFFFF',
    hero: '#C6DDCB', heroText: '#244632', heroMuted: '#5A7B62', heroIcon: '#437957',
    rain: '#367A91', track: '#ABC9B2', sceneBg: '#ADD0B6', footer: '#698674',
    sheet: '#F1F9F2', danger: '#9C3C3C', statusBarStyle: 'dark-content'
  },
  fog: {
    background: '#E8EDE9', card: '#FAFCFA', cardLight: '#DDE7E2', line: '#CCD8D2',
    white: '#324740', muted: '#5C7168', accent: '#536F60', accentInk: '#FFFFFF',
    hero: '#CFDDD6', heroText: '#2E4940', heroMuted: '#637B70', heroIcon: '#506F65',
    rain: '#377D98', track: '#B3C6BC', sceneBg: '#BED1C6', footer: '#6C8177',
    sheet: '#F2F7F3', danger: '#9D3D3D', statusBarStyle: 'dark-content'
  }
};

// Night hues are distinct by weather, rather than replacing every scene with
// the same generic dark background. Each keeps sufficient text contrast.
const nightColors = {
  clear: { background:'#071C26', card:'#132E39', hero:'#193744', accent:'#B4DFD3', heroIcon:'#D9E8BA', sceneBg:'#15323D' },
  hot: { background:'#211E25', card:'#322D35', hero:'#443743', accent:'#F9D29A', heroIcon:'#F5CD89', sceneBg:'#372E3D' },
  cloud: { background:'#121F2B', card:'#213241', hero:'#2B4152', accent:'#B2CFDF', heroIcon:'#E2EAF1', sceneBg:'#283F4C' },
  rain: { background:'#071820', card:'#122C37', hero:'#1C3B4A', accent:'#93D6ED', heroIcon:'#C2EAF5', sceneBg:'#193744' },
  storm: { background:'#0D1020', card:'#1A2340', hero:'#272D4B', accent:'#D7C3FF', heroIcon:'#E3CEFF', sceneBg:'#252C45' },
  snow: { background:'#142331', card:'#263A4A', hero:'#32495C', accent:'#CAE6FC', heroIcon:'#E4F6FF', sceneBg:'#2D4856' },
  wind: { background:'#10251F', card:'#213A30', hero:'#2C483C', accent:'#C0E8C9', heroIcon:'#DCF3CB', sceneBg:'#28483D' },
  fog: { background:'#17242A', card:'#2A3A3E', hero:'#3A4E52', accent:'#C6D8CF', heroIcon:'#E0EAE3', sceneBg:'#344B4D' }
};

function getWeatherTheme(scene) {
  const condition = scene && Object.prototype.hasOwnProperty.call(palettes, scene.condition)
    ? scene.condition : 'cloud';
  const base = palettes[condition];
  if (!scene?.isNight) return { ...base, condition, isNight: false };
  const adjusted = nightColors[condition];
  return {
    ...base, ...adjusted,
    cardLight: adjusted.hero, line: '#455766', white: '#F6FBFF', muted: '#B8CCD3',
    heroText: '#F6FBFF', heroMuted: '#D2E0E5', accentInk: '#142831',
    rain: '#A8D8EF', track: '#46616B', footer: '#A3B7BF',
    sheet: adjusted.card, danger: '#FFB7B3', statusBarStyle: 'light-content',
    condition, isNight: true
  };
}

module.exports = { getWeatherTheme, palettes, nightColors };
