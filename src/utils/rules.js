/**
 * Agricultural Rules & Operational Windows Engine
 * Evaluates weather conditions to calculate precise spraying windows, 
 * optimal start/stop times, daily & hourly recommendations for farmers.
 */

// General spraying thresholds
const SPRAY_MIN_WIND = 3;   // km/h
const SPRAY_MAX_WIND = 15;  // km/h
const SPRAY_MAX_TEMP = 30;  // °C
const SPRAY_MIN_HUM = 40;   // %
const SPRAY_MAX_GUST = 22;  // km/h

/**
 * Calculates Delta T (°C) for agricultural spraying.
 */
export const calculateDeltaT = (temp, hum) => {
  if (temp === undefined || hum === undefined) return { deltaT: 0, status: 'yellow', zone: 'Sin datos', advice: '' };

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
 * Evaluates general task conditions (no crop division).
 */
export const evaluateConditions = (task, current) => {
  if (!current) return { status: 'yellow', message: 'Cargando datos...' };

  const {
    temperature_2m: temp,
    relative_humidity_2m: hum,
    wind_speed_10m: wind,
    wind_gusts_10m: gusts,
    precipitation: rain
  } = current;

  const { deltaT } = calculateDeltaT(temp, hum);

  if (task === 'pulverizar' || task === 'fumigar') {
    if (rain > 0) return { status: 'red', message: `No aplicar. Lluvia activa (${rain} mm) lava el producto.` };
    if (wind > SPRAY_MAX_WIND || gusts > SPRAY_MAX_GUST) return { status: 'red', message: `No aplicar. Viento fuerte (${wind} km/h, Ráfagas ${gusts} km/h) causa deriva.` };
    if (wind < SPRAY_MIN_WIND) return { status: 'yellow', message: `Precaución. Viento calmo (${wind} km/h), posible Inversión Térmica.` };
    if (temp > SPRAY_MAX_TEMP) return { status: 'red', message: `No aplicar. Temperatura extrema (${temp}°C), altísima evaporación.` };
    if (hum < SPRAY_MIN_HUM) return { status: 'yellow', message: `Precaución. Baja humedad (${hum}%), Delta T: ${deltaT}°C. Usar antievaporante.` };
    if (deltaT > 8) return { status: 'yellow', message: `Precaución. Delta T alto (${deltaT}°C), riesgo de pérdidas por evaporación.` };
    return { status: 'green', message: `Condiciones atmosféricas ideales para pulverizar.` };
  }

  if (task === 'sembrar') {
    if (rain > 5) return { status: 'red', message: `Lluvia acumulada alto (${rain} mm), riesgo de encharcamiento y suelo pesado.` };
    if (temp < 10) return { status: 'yellow', message: `Temperatura fresca (${temp}°C), germinación lenta.` };
    return { status: 'green', message: `Condiciones favorables de suelo y temperatura para siembra.` };
  }

  if (task === 'cosechar') {
    if (rain > 0) return { status: 'red', message: `Lluvia activa (${rain} mm). Imposible trillar.` };
    if (hum > 75) return { status: 'red', message: `Humedad de ambiente elevada (${hum}%), riesgo de entrega de grano húmedo.` };
    if (hum > 65) return { status: 'yellow', message: `Humedad límite (${hum}%), vigilar gasto de secadora.` };
    return { status: 'green', message: `Humedad de aire óptima para cosecha limpia.` };
  }

  return { status: 'yellow', message: 'Sin datos para esta tarea.' };
};

/**
 * Evaluates a single hour for spraying suitability.
 */
export const evaluateHourlySpraying = (hourData) => {
  const { temp, hum, wind, gusts, rain } = hourData;
  const { deltaT } = calculateDeltaT(temp, hum);

  if (rain > 0) {
    return { status: 'red', label: 'Lluvia', reason: `Lluvia activa (${rain} mm)` };
  }
  if (wind > SPRAY_MAX_WIND || gusts > SPRAY_MAX_GUST) {
    return { status: 'red', label: 'Viento Alto', reason: `Viento: ${wind} km/h (Ráfagas: ${gusts} km/h)` };
  }
  if (temp > SPRAY_MAX_TEMP) {
    return { status: 'red', label: 'Calor Extremo', reason: `Temperatura ${temp}°C` };
  }
  if (deltaT > 10) {
    return { status: 'red', label: 'Delta T Alto', reason: `Delta T crítico (${deltaT}°C)` };
  }

  if (wind < SPRAY_MIN_WIND) {
    return { status: 'yellow', label: 'Viento Calmo', reason: `Viento < 3 km/h (Inversión Térmica)` };
  }
  if (temp > 27 || hum < 40 || deltaT > 8) {
    return { status: 'yellow', label: 'Evaporación', reason: `Delta T: ${deltaT}°C, Humedad: ${hum}%` };
  }

  return { status: 'green', label: 'Óptimo', reason: 'Condiciones perfectas para aplicar' };
};

/**
 * Analyzes full week weather to generate optimal spray windows, 
 * best days, start/stop times per day.
 */
export const analyzeWeeklySprayingWindows = (weatherData) => {
  if (!weatherData?.hourly || !weatherData?.daily) return null;

  const { hourly, daily } = weatherData;
  const daysAnalysis = [];

  // Group 168 hours by day index (0..6)
  for (let d = 0; d < daily.time.length; d++) {
    const dayDateStr = daily.time[d];
    const sunrise = daily.sunrise ? daily.sunrise[d] : null;
    const sunset = daily.sunset ? daily.sunset[d] : null;

    // Collect hours for this day
    const dayHours = [];
    for (let h = 0; h < hourly.time.length; h++) {
      const timeStr = hourly.time[h];
      if (timeStr.startsWith(dayDateStr)) {
        const temp = hourly.temperature_2m[h];
        const hum = hourly.relative_humidity_2m[h];
        const wind = hourly.wind_speed_10m[h];
        const gusts = hourly.wind_gusts_10m[h];
        const rain = hourly.precipitation[h];
        const hourNum = new Date(timeStr).getHours();

        const evalResult = evaluateHourlySpraying({ temp, hum, wind, gusts, rain });

        dayHours.push({
          index: h,
          timeStr,
          hourNum,
          temp,
          hum,
          wind,
          gusts,
          rain,
          eval: evalResult
        });
      }
    }

    // Filter hours between 06:00 and 21:00 (practical working daylight hours)
    const workDayHours = dayHours.filter(item => item.hourNum >= 6 && item.hourNum <= 21);
    
    const greenHours = workDayHours.filter(item => item.eval.status === 'green');
    const yellowHours = workDayHours.filter(item => item.eval.status === 'yellow');
    const redHours = workDayHours.filter(item => item.eval.status === 'red');

    // Find continuous green/yellow windows
    let bestStart = null;
    let bestStop = null;
    const windowsStrList = [];

    let currentWindow = [];
    workDayHours.forEach(item => {
      if (item.eval.status === 'green' || item.eval.status === 'yellow') {
        currentWindow.push(item);
      } else {
        if (currentWindow.length >= 2) {
          const startH = currentWindow[0].hourNum.toString().padStart(2, '0');
          const endH = (currentWindow[currentWindow.length - 1].hourNum + 1).toString().padStart(2, '0');
          windowsStrList.push(`${startH}:00 a ${endH}:00 hs`);
        }
        currentWindow = [];
      }
    });
    if (currentWindow.length >= 2) {
      const startH = currentWindow[0].hourNum.toString().padStart(2, '0');
      const endH = (currentWindow[currentWindow.length - 1].hourNum + 1).toString().padStart(2, '0');
      windowsStrList.push(`${startH}:00 a ${endH}:00 hs`);
    }

    if (greenHours.length > 0) {
      bestStart = `${greenHours[0].hourNum.toString().padStart(2, '0')}:00 hs`;
      
      // Find where conditions deteriorate (red or yellow after mid-day)
      const stopSlot = workDayHours.find((item, idx) => item.hourNum > greenHours[0].hourNum && item.eval.status === 'red');
      if (stopSlot) {
        bestStop = `${stopSlot.hourNum.toString().padStart(2, '0')}:00 hs (${stopSlot.eval.reason})`;
      } else {
        bestStop = `${(greenHours[greenHours.length - 1].hourNum + 1).toString().padStart(2, '0')}:00 hs`;
      }
    }

    let overallStatus = 'green';
    let summaryText = '';
    if (greenHours.length >= 6) {
      overallStatus = 'green';
      summaryText = `Excelente jornada (${greenHours.length} hs óptimas para pulverizar).`;
    } else if (greenHours.length + yellowHours.length >= 4) {
      overallStatus = 'yellow';
      summaryText = `Ventana reducida (${greenHours.length} hs óptimas, ${yellowHours.length} hs precaución).`;
    } else {
      overallStatus = 'red';
      summaryText = `Día desfavorable (${redHours.length} hs malas por viento/lluvia/calor).`;
    }

    daysAnalysis.push({
      dayIndex: d,
      dateStr: dayDateStr,
      sunrise,
      sunset,
      greenCount: greenHours.length,
      yellowCount: yellowHours.length,
      redCount: redHours.length,
      overallStatus,
      summaryText,
      bestStart: bestStart || 'Sin ventana ideal',
      bestStop: bestStop || 'N/D',
      windows: windowsStrList.length > 0 ? windowsStrList : ['Sin ventana de trabajo continua'],
      maxWind: daily.wind_speed_10m_max[d],
      maxGust: daily.wind_gusts_10m_max[d],
      rainSum: daily.precipitation_sum[d],
      maxTemp: daily.temperature_2m_max[d],
      minTemp: daily.temperature_2m_min[d],
      hours: dayHours
    });
  }

  // Find the single Best Day of the Week (highest green hours, lowest rain)
  const sortedDays = [...daysAnalysis].sort((a, b) => {
    if (b.greenCount !== a.greenCount) return b.greenCount - a.greenCount;
    if (a.rainSum !== b.rainSum) return a.rainSum - b.rainSum;
    return a.maxWind - b.maxWind;
  });

  const bestDayOfWeek = sortedDays[0];

  return {
    days: daysAnalysis,
    bestDayOfWeek,
    today: daysAnalysis[0]
  };
};

/**
 * Evaluates Thermal Inversion Risk.
 */
export const evaluateThermalInversion = (windSpeed) => {
  if (windSpeed === undefined) return null;

  if (windSpeed < 3) {
    return {
      status: 'red',
      title: 'Alto Riesgo de Inversión Térmica',
      advice: 'Calma chicha (viento < 3 km/h). Las gotas quedan flotando suspendidas y se desplazan km.'
    };
  } else if (windSpeed >= 3 && windSpeed <= 6) {
    return {
      status: 'yellow',
      title: 'Riesgo Moderado de Inversión',
      advice: 'Atención al amanecer/atardecer. Chequear temperatura del suelo.'
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
 * Evaluates Soil Trafficability (Piso en Lote).
 */
export const evaluateSoilTrafficability = (precip, hum) => {
  if (precip === undefined) return null;

  if (precip > 15 || (precip > 5 && hum > 85)) {
    return {
      status: 'red',
      title: 'Piso Pesado / Barro',
      advice: 'Riesgo de empantanamiento y huellado profundo del suelo.'
    };
  } else if (precip > 2) {
    return {
      status: 'yellow',
      title: 'Piso Húmedo',
      advice: 'Ingresar con precaución en bajíos y cabeceras.'
    };
  } else {
    return {
      status: 'green',
      title: 'Piso Firme / Transitable',
      advice: 'Condiciones óptimas para paso de pulverizadoras y tractores.'
    };
  }
};

/**
 * Evaluates Frost Risk.
 */
export const evaluateFrostRisk = (temp, minTemp) => {
  if (temp === undefined) return null;
  const lowest = Math.min(temp, minTemp ?? temp);

  if (lowest <= 0) {
    return {
      status: 'red',
      title: 'Helada Meteorológica Severa',
      advice: `Temperaturas bajo cero (${lowest}°C). Alto riesgo en brotes.`
    };
  } else if (lowest <= 3) {
    return {
      status: 'yellow',
      title: 'Riesgo de Helada Agronómica',
      advice: `Temp cerca del suelo (${lowest}°C). Posible formación de escarcha.`
    };
  } else {
    return {
      status: 'green',
      title: 'Sin Riesgo de Heladas',
      advice: 'Temperaturas por encima del umbral de helada.'
    };
  }
};
