/**
 * Agricultural Rules & Insights Engine
 * Evaluates weather parameters to compute operational indicators for farmers.
 */

// General spraying thresholds
const SPRAY_MIN_WIND = 3;   // km/h
const SPRAY_MAX_WIND = 15;  // km/h
const SPRAY_MAX_TEMP = 30;  // °C
const SPRAY_MIN_HUM = 40;   // %
const SPRAY_MAX_GUST = 20;  // km/h

const SOW_MIN_TEMP = 10;    // °C (soil/air proxy)
const SOW_MAX_RAIN = 5;     // mm/h limit to avoid washout

const HARVEST_MAX_HUM = 65; // %
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
    if (rain > 0) return { status: 'red', message: `No aplicar con lluvia (${rain} mm). Lavado de producto.` };
    if (wind > SPRAY_MAX_WIND || gusts > SPRAY_MAX_GUST) return { status: 'red', message: `Viento excesivo. Constante: ${wind} km/h, Ráfagas: ${gusts} km/h (Deriva).` };
    if (wind < SPRAY_MIN_WIND) return { status: 'yellow', message: `Viento escaso (${wind} km/h), riesgo de Inversión Térmica.` };
    if (temp > SPRAY_MAX_TEMP) return { status: 'red', message: `Temperatura elevada (${temp}°C), alta tasa de evaporación.` };
    if (hum < SPRAY_MIN_HUM) return { status: 'yellow', message: `Baja humedad (${hum}%), gotas finas pueden evaporarse.` };
    return { status: 'green', message: `Condiciones atmosféricas óptimas para pulverización.` };
  }

  if (task === 'sembrar') {
    if (rain > SOW_MAX_RAIN) return { status: 'red', message: `Exceso de lluvia (${rain} mm), riesgo de encharcamiento y planchado.` };
    
    if (grain === 'Soja' || grain === 'Maíz' || grain === 'Girasol') {
      if (temp < SOW_MIN_TEMP) return { status: 'yellow', message: `Temperatura baja (${temp}°C) para germinación adecuada.` };
    }
    return { status: 'green', message: `Buenas condiciones de suelo y clima para siembra.` };
  }

  if (task === 'cosechar') {
    if (rain > HARVEST_MAX_RAIN) return { status: 'red', message: `Lluvia activa (${rain} mm). Imposible cosechar.` };
    if (hum > HARVEST_MAX_HUM) {
      if (hum > 80) return { status: 'red', message: `Humedad muy alta (${hum}%), riesgo de entregar grano húmedo.` };
      return { status: 'yellow', message: `Humedad límite (${hum}%), verificar gasto de secadora.` };
    }
    return { status: 'green', message: `Humedad de ambiente óptima para trilla limpia.` };
  }

  return { status: 'yellow', message: 'Sin datos para esta tarea.' };
};

/**
 * Calculates Delta T (°C) for agricultural spraying.
 * Formula uses Stull wet-bulb approximation.
 */
export const calculateDeltaT = (temp, hum) => {
  if (temp === undefined || hum === undefined) return null;

  // Stull Wet-Bulb Temperature formula
  const T = temp;
  const RH = hum;
  const Tw = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
             Math.atan(T + RH) - Math.atan(RH - 1.676331) +
             0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;

  const deltaT = Math.round((T - Tw) * 10) / 10;

  let status = 'green';
  let zone = 'Ideal (2°C - 8°C)';
  let advice = 'Ventana delta T óptima para aplicación de agroquímicos.';

  if (deltaT < 2) {
    status = 'yellow';
    zone = 'Bajo (< 2°C)';
    advice = 'Poca evaporación pero ALTO RIESGO de Inversión Térmica y deriva estática.';
  } else if (deltaT >= 2 && deltaT <= 8) {
    status = 'green';
    zone = 'Óptimo (2°C - 8°C)';
    advice = 'Excelente balance entre evaporación y vida útil de la gota.';
  } else if (deltaT > 8 && deltaT <= 10) {
    status = 'yellow';
    zone = 'Precaución (8°C - 10°C)';
    advice = 'Usar gotas medianas/gruesas y coadyuvante antievaporante.';
  } else {
    status = 'red';
    zone = 'Crítico (> 10°C)';
    advice = 'Evaporación extrema. Las gotas se evaporan antes de llegar al blanco.';
  }

  return { deltaT, status, zone, advice };
};

/**
 * Evaluates Thermal Inversion Risk for agricultural application.
 */
export const evaluateThermalInversion = (windSpeed, cloudCover = 0) => {
  if (windSpeed === undefined) return null;

  if (windSpeed < 3) {
    return {
      status: 'red',
      title: 'Alto Riesgo de Inversión Térmica',
      advice: 'Calma chicha (viento < 3 km/h). Las gotas quedan flotando suspendidas y son desplazadas km.'
    };
  } else if (windSpeed >= 3 && windSpeed <= 6) {
    return {
      status: 'yellow',
      title: 'Riesgo Moderado de Inversión',
      advice: 'Atención al amanecer/atardecer. Chequear temperatura a 10cm y 2m del suelo.'
    };
  } else {
    return {
      status: 'green',
      title: 'Bajo Riesgo de Inversión',
      advice: 'Viento continuo adecuado para mezclado vertical del aire.'
    };
  }
};

/**
 * Evaluates Soil Trafficability (Piso en Lote para Maquinaria).
 */
export const evaluateSoilTrafficability = (precip, hum) => {
  if (precip === undefined) return null;

  if (precip > 15 || (precip > 5 && hum > 85)) {
    return {
      status: 'red',
      title: 'Piso Pesado / Barro',
      advice: 'Riesgo de empantanamiento y huellado / compactación profunda del suelo.'
    };
  } else if (precip > 2) {
    return {
      status: 'yellow',
      title: 'Piso Húmedo',
      advice: 'Ingresar con precaución en cabeceras y bajo relieve.'
    };
  } else {
    return {
      status: 'green',
      title: 'Piso Firme / Transitable',
      advice: 'Condiciones adecuadas para tránsito de tractores, pulverizadoras y mosquitos.'
    };
  }
};

/**
 * Evaluates Frost Risk for crops.
 */
export const evaluateFrostRisk = (temp, minTemp) => {
  if (temp === undefined) return null;

  const lowest = Math.min(temp, minTemp ?? temp);

  if (lowest <= 0) {
    return {
      status: 'red',
      title: 'Helada Meteorológica Severa',
      advice: `Temperaturas bajo cero (${lowest}°C). Alto riesgo de daño por congelamiento.`
    };
  } else if (lowest <= 3) {
    return {
      status: 'yellow',
      title: 'Riesgo de Helada Agronómica',
      advice: `Temp cerca del suelo (${lowest}°C). Posible formación de escarcha en bajíos.`
    };
  } else {
    return {
      status: 'green',
      title: 'Sin Riesgo de Heladas',
      advice: 'Temperaturas por encima del umbral de congelamiento.'
    };
  }
};
