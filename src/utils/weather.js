export const fetchWeather = async (lat, lon) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=America%2FArgentina%2FBuenos_Aires&past_days=1&forecast_days=3`;
  
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

export const CITIES = [
  { name: "Pergamino", lat: -33.89, lon: -60.57 },
  { name: "Rosario", lat: -32.95, lon: -60.64 },
  { name: "Tandil", lat: -37.33, lon: -59.13 },
  { name: "Bahía Blanca", lat: -38.72, lon: -62.27 },
  { name: "Junín", lat: -34.58, lon: -60.95 },
  { name: "Chivilcoy", lat: -34.89, lon: -60.01 },
  { name: "Trenque Lauquen", lat: -35.97, lon: -62.73 },
];

export const getWindDirectionName = (degree) => {
  if (degree >= 337.5 || degree < 22.5) return 'N';
  if (degree >= 22.5 && degree < 67.5) return 'NE';
  if (degree >= 67.5 && degree < 112.5) return 'E';
  if (degree >= 112.5 && degree < 157.5) return 'SE';
  if (degree >= 157.5 && degree < 202.5) return 'S';
  if (degree >= 202.5 && degree < 247.5) return 'SO';
  if (degree >= 247.5 && degree < 292.5) return 'O';
  if (degree >= 292.5 && degree < 337.5) return 'NO';
  return '';
};
