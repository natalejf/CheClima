export const fetchWeather = async (lat, lon) => {
  const currentParams = [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'rain',
    'weather_code',
    'cloud_cover',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'surface_pressure',
    'dew_point_2m',
    'soil_temperature_0cm',
    'soil_moisture_0_to_1cm'
  ].join(',');

  const hourlyParams = [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation_probability',
    'precipitation',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'weather_code',
    'dew_point_2m',
    'soil_temperature_0cm',
    'soil_moisture_0_to_1cm',
    'et0_fao_evapotranspiration'
  ].join(',');

  const dailyParams = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'sunrise',
    'sunset',
    'et0_fao_evapotranspiration',
    'uv_index_max'
  ].join(',');

  // Query past_days=3 to analyze accumulated rain from recent days alongside forecast_days=7
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${currentParams}&hourly=${hourlyParams}&daily=${dailyParams}&past_days=3&forecast_days=7&timezone=America%2FArgentina%2FBuenos_Aires`;
  
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

export const DEFAULT_CITY = {
  name: "Necochea",
  admin1: "Buenos Aires",
  country: "Argentina",
  lat: -38.5473,
  lon: -58.7368
};

export const POPULAR_CITIES = [
  { name: "Necochea", admin1: "Buenos Aires", country: "Argentina", lat: -38.5473, lon: -58.7368 },
  { name: "Pergamino", admin1: "Buenos Aires", country: "Argentina", lat: -33.89, lon: -60.57 },
  { name: "Rosario", admin1: "Santa Fe", country: "Argentina", lat: -32.95, lon: -60.64 },
  { name: "Tandil", admin1: "Buenos Aires", country: "Argentina", lat: -37.33, lon: -59.13 },
  { name: "Bahía Blanca", admin1: "Buenos Aires", country: "Argentina", lat: -38.72, lon: -62.27 },
  { name: "Junín", admin1: "Buenos Aires", country: "Argentina", lat: -34.58, lon: -60.95 },
  { name: "Balcarce", admin1: "Buenos Aires", country: "Argentina", lat: -37.84, lon: -58.25 },
  { name: "Trenque Lauquen", admin1: "Buenos Aires", country: "Argentina", lat: -35.97, lon: -62.73 },
  { name: "Río Cuarto", admin1: "Córdoba", country: "Argentina", lat: -31.13, lon: -64.35 },
  { name: "Marcos Juárez", admin1: "Córdoba", country: "Argentina", lat: -32.70, lon: -62.11 },
  { name: "Rafaela", admin1: "Santa Fe", country: "Argentina", lat: -31.25, lon: -61.49 },
  { name: "Venado Tuerto", admin1: "Santa Fe", country: "Argentina", lat: -33.74, lon: -61.96 }
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

/**
 * Returns southern hemisphere astronomical/agricultural season and contextual agronomic stage.
 */
export const getSouthernHemisphereSeason = (date = new Date()) => {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Southern hemisphere seasons:
  // Verano: 21 Dic - 20 Mar
  // Otoño: 21 Mar - 20 Jun
  // Invierno: 21 Jun - 20 Sep
  // Primavera: 21 Sep - 20 Dic
  if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day < 21)) {
    return {
      name: 'Verano',
      badge: '☀️ Verano',
      period: 'Diciembre - Marzo',
      stage: 'Campaña Gruesa (Llenado de grano y Cosecha Temprana)',
      focus: 'Evaporación crítica por altas temperaturas, orugas y chinches. Máxima vigilancia de Delta T y estrés térmico.'
    };
  }
  if ((month === 3 && day >= 21) || month === 4 || month === 5 || (month === 6 && day < 21)) {
    return {
      name: 'Otoño',
      badge: '🍂 Otoño',
      period: 'Marzo - Junio',
      stage: 'Pico de Cosecha Gruesa (Soja / Maíz)',
      focus: 'Humedad en grano, rocíos persistentes y reducción de horas de sol para trilla limpia. Barbechos químicos de inicio.'
    };
  }
  if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day < 21)) {
    return {
      name: 'Invierno',
      badge: '❄️ Invierno',
      period: 'Junio - Septiembre',
      stage: 'Campaña Fina (Trigo / Cebada) & Barbechos',
      focus: 'Riesgo severo de heladas agronómicas, baja evaporación, piso frío y aplicaciones de herbicidas residuales con suelo húmedo.'
    };
  }
  return {
    name: 'Primavera',
    badge: '🌱 Primavera',
    period: 'Septiembre - Diciembre',
    stage: 'Cosecha Fina (Trigo / Cebada) & Pulverizaciones de Presiembra/Postemergencia',
    focus: 'Vientos fuertes frecuentes, frentes de tormenta rápidos y ventanas de fungicidas foliares en cereales de invierno.'
  };
};
