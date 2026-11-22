const COUNTRIES = {
  LS: {
    code: 'LS',
    name: 'Lesotho',
    short: 'LS',
    cities: [
      { id: 'ls-maseru', name: 'Maseru', lat: -29.3167, lon: 27.4833 },
      { id: 'ls-teyateyaneng', name: 'Teyateyaneng', lat: -29.1472, lon: 27.7422 },
      { id: 'ls-mafeteng', name: 'Mafeteng', lat: -29.8229, lon: 27.2381 },
      { id: 'ls-hlotse', name: 'Leribe (Hlotse)', aliases: ['Leribe', 'Hlotse', 'Khlotse'], region: 'Leribe District', lat: -28.871849, lon: 28.045009 },
      { id: 'ls-maputsoe', name: 'Maputsoe', aliases: ['Maputsoe, Leribe'], region: 'Leribe District', lat: -28.886597, lon: 27.899145 },
      { id: 'ls-butha-buthe', name: 'Butha-Buthe', lat: -28.7666, lon: 28.2494 },
      { id: 'ls-mohales-hoek', name: "Mohale's Hoek", lat: -30.1517, lon: 27.4769 },
      { id: 'ls-quthing', name: 'Quthing', lat: -30.4000, lon: 27.7000 },
      { id: 'ls-mokhotlong', name: 'Mokhotlong', lat: -29.2885, lon: 29.0659 },
      { id: 'ls-thaba-tseka', name: 'Thaba-Tseka', lat: -29.5230, lon: 28.6084 }
    ]
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    short: 'SA',
    cities: [
      { id: 'za-johannesburg', name: 'Johannesburg', lat: -26.2041, lon: 28.0473 },
      { id: 'za-cape-town', name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
      { id: 'za-durban', name: 'Durban', lat: -29.8587, lon: 31.0218 },
      { id: 'za-pretoria', name: 'Pretoria', lat: -25.7479, lon: 28.2293 },
      { id: 'za-bloemfontein', name: 'Bloemfontein', lat: -29.0852, lon: 26.1596 },
      { id: 'za-polokwane', name: 'Polokwane', lat: -23.9045, lon: 29.4689 },
      { id: 'za-gqeberha', name: 'Gqeberha', lat: -33.9608, lon: 25.6022 },
      { id: 'za-east-london', name: 'East London', lat: -33.0292, lon: 27.8546 },
      { id: 'za-kimberley', name: 'Kimberley', lat: -28.7282, lon: 24.7499 },
      { id: 'za-mbombela', name: 'Mbombela', lat: -25.4658, lon: 30.9853 }
    ]
  }
};
function cityMatchesSearch(city, search) {
  const q=String(search||'').trim().toLocaleLowerCase();
  if (!q) return true;
  return [city.name, city.region, ...(city.aliases || [])].filter(Boolean).some(value=>value.toLocaleLowerCase().includes(q));
}
module.exports = { COUNTRIES, cityMatchesSearch };
