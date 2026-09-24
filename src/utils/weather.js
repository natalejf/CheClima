export const fetchWeather = async (lat, lon) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=7`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching weather from Open-Meteo", error);
    return null;
  }
};

export const searchCities = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=es&format=json`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search cities');
    const data = await response.json();
    if (!data.results) return [];
    return data.results.map(item => ({
      name: item.name,
      admin1: item.admin1 || '',
      country: item.country || '',
      lat: item.latitude,
      lon: item.longitude
    }));
  } catch (error) {
    console.error("Error searching cities", error);
    return [];
  }
};

export const POPULAR_CITIES = [
  { name: "Pergamino", admin1: "Buenos Aires", country: "Argentina", lat: -33.89, lon: -60.57 },
  { name: "Rosario", admin1: "Santa Fe", country: "Argentina", lat: -32.95, lon: -60.64 },
  { name: "Tandil", admin1: "Buenos Aires", country: "Argentina", lat: -37.33, lon: -59.13 },
  { name: "Bahía Blanca", admin1: "Buenos Aires", country: "Argentina", lat: -38.72, lon: -62.27 },
  { name: "Junín", admin1: "Buenos Aires", country: "Argentina", lat: -34.58, lon: -60.95 },
  { name: "Chivilcoy", admin1: "Buenos Aires", country: "Argentina", lat: -34.89, lon: -60.01 },
  { name: "Trenque Lauquen", admin1: "Buenos Aires", country: "Argentina", lat: -35.97, lon: -62.73 },
  { name: "Balcarce", admin1: "Buenos Aires", country: "Argentina", lat: -37.84, lon: -58.25 }
];

export const getWindDirectionName = (degree) => {
  if (degree === undefined || degree === null) return 'N/D';
  if (degree >= 337.5 || degree < 22.5) return 'Norte';
  if (degree >= 22.5 && degree < 67.5) return 'Noreste';
  if (degree >= 67.5 && degree < 112.5) return 'Este';
  if (degree >= 112.5 && degree < 157.5) return 'Sudeste';
  if (degree >= 157.5 && degree < 202.5) return 'Sur';
  if (degree >= 202.5 && degree < 247.5) return 'Sudoeste';
  if (degree >= 247.5 && degree < 292.5) return 'Oeste';
  if (degree >= 292.5 && degree < 337.5) return 'Noroeste';
  return 'Norte';
};

export const getWeatherDescription = (code) => {
  switch (code) {
    case 0: return 'Despejado';
    case 1: return 'Mayormente despejado';
    case 2: return 'Parcialmente nublado';
    case 3: return 'Nublado';
    case 45: case 48: return 'Niebla';
    case 51: case 53: case 55: return 'Llovizna';
    case 61: case 63: case 65: return 'Lluvia';
    case 71: case 73: case 75: return 'Nieve';
    case 80: case 81: case 82: return 'Chubascos de lluvia';
    case 95: case 96: case 99: return 'Tormenta eléctrica';
    default: return 'Variables';
  }
};

export const formatTimeHHMM = (isoString) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const calculateDaylightDuration = (sunriseIso, sunsetIso) => {
  if (!sunriseIso || !sunsetIso) return null;
  const start = new Date(sunriseIso);
  const end = new Date(sunsetIso);
  const diffMs = end - start;
  if (diffMs <= 0) return null;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
};
