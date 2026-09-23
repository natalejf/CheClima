/**
 * Agricultural Rules Engine
 * Evaluates weather conditions to determine if a task is suitable.
 * Returns: { status: 'green' | 'yellow' | 'red', message: string }
 */

// General thresholds
const SPRAY_MIN_WIND = 3;   // km/h
const SPRAY_MAX_WIND = 15;  // km/h
const SPRAY_MAX_TEMP = 30;  // °C
const SPRAY_MIN_HUM = 40;   // %
const SPRAY_MAX_GUST = 20;  // km/h

const SOW_MIN_TEMP = 10;    // °C (soil/air proxy)
const SOW_MAX_RAIN = 5;     // mm/h limit to avoid washout

const HARVEST_MAX_HUM = 60; // %
const HARVEST_MAX_RAIN = 0; // mm

export const evaluateConditions = (task, grain, current) => {
  if (!current) return { status: 'yellow', message: 'Cargando datos...' };

  const {
    temperature_2m: temp,
    relative_humidity_2m: hum,
    wind_speed_10m: wind,
    wind_gusts_10m: gusts,
    precipitation: rain
  } = current;

  if (task === 'pulverizar' || task === 'fumigar') {
    if (rain > 0) return { status: 'red', message: `No aplicar con lluvia (${rain} mm).` };
    if (wind > SPRAY_MAX_WIND || gusts > SPRAY_MAX_GUST) return { status: 'red', message: `Viento fuerte. Constante: ${wind} km/h, Ráfagas: ${gusts} km/h.` };
    if (wind < SPRAY_MIN_WIND) return { status: 'yellow', message: `Poco viento (${wind} km/h), riesgo de inversión térmica.` };
    if (temp > SPRAY_MAX_TEMP) return { status: 'red', message: `Temperatura muy alta (${temp}°C), evaporación rápida.` };
    if (hum < SPRAY_MIN_HUM) return { status: 'yellow', message: `Baja humedad (${hum}%), gotas pueden evaporarse.` };
    return { status: 'green', message: `Condiciones óptimas para pulverizar.` };
  }

  if (task === 'sembrar') {
    if (rain > SOW_MAX_RAIN) return { status: 'red', message: `Lluvia fuerte (${rain} mm), riesgo de encharcamiento.` };
    
    // Grain specific proxy rules
    if (grain === 'Soja' || grain === 'Maíz' || grain === 'Girasol') {
      if (temp < SOW_MIN_TEMP) return { status: 'yellow', message: `Temperatura baja (${temp}°C) para germinación.` };
    }
    return { status: 'green', message: `Buenas condiciones para siembra.` };
  }

  if (task === 'cosechar') {
    if (rain > HARVEST_MAX_RAIN) return { status: 'red', message: `No cosechar lloviendo.` };
    if (hum > HARVEST_MAX_HUM) {
      if (hum > 80) return { status: 'red', message: `Humedad muy alta (${hum}%), riesgo de grano húmedo.` };
      return { status: 'yellow', message: `Humedad límite (${hum}%), vigilar secadora.` };
    }
    return { status: 'green', message: `Humedad óptima para cosecha.` };
  }

  return { status: 'yellow', message: 'Sin datos para esta tarea.' };
};
