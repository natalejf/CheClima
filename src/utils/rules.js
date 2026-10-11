import { getWindDirectionName } from './weather';

/**
 * Agricultural Rules & Operational Windows Engine
 * Evaluates weather and agronomic conditions for Fumigación, Pulverización, and Cosecha.
 * All planting (siembra) logic has been completely removed to focus on operational application & harvesting.
 */

// General spraying thresholds (BPA - Buenas Prácticas Agrícolas)
export const SPRAY_THRESHOLDS = {
  minWind: 3,     // km/h (below 3 km/h is thermal inversion risk)
  idealMaxWind: 15, // km/h (ideal ceiling for medium droplets)
  limitMaxWind: 18, // km/h (requires air induction nozzles / anti-drift)
  criticalWind: 22, // km/h (strict stop)
  maxTemp: 30,    // °C (critical evaporation)
  warningTemp: 27,// °C
  minHum: 40,     // % (dry air, rapid drop evaporation)
  warningHum: 50, // %
  maxGust: 22     // km/h
};

/**
 * Calculates Delta T (°C) for agricultural spraying.
 * Formula uses wet-bulb temperature via Stull approximation.
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
  let zone = 'Óptimo (2°C - 8°C)';
  let advice = 'Excelente balance entre evaporación y vida útil de la gota.';

  if (deltaT < 2) {
    status = 'yellow';
    zone = 'Bajo (< 2°C)';
    advice = 'Poca evaporación pero ALTO RIESGO de Inversión Térmica y gotas suspendidas.';
  } else if (deltaT >= 2 && deltaT <= 8) {
    status = 'green';
    zone = 'Óptimo (2°C - 8°C)';
    advice = 'Condiciones excelentes para absorción y persistencia del caldo.';
  } else if (deltaT > 8 && deltaT <= 10) {
    status = 'yellow';
    zone = 'Precaución (8°C - 10°C)';
    advice = 'Usar gotas medianas a gruesas y coadyuvante antievaporante (aceite mineral/vegetal).';
  } else {
    status = 'red';
    zone = 'Crítico (> 10°C)';
    advice = 'Evaporación extrema. La gota se evapora antes de depositarse en el blanco.';
  }

  return { deltaT, status, zone, advice };
};

/**
 * Evaluates general task conditions: Fumigar, Pulverizar, Cosechar.
 */
export const evaluateConditions = (task, current) => {
  if (!current) return { status: 'yellow', message: 'Cargando datos...', details: [] };

  const {
    temperature_2m: temp,
    relative_humidity_2m: hum,
    wind_speed_10m: wind,
    wind_gusts_10m: gusts,
    precipitation: rain
  } = current;

  const { deltaT } = calculateDeltaT(temp, hum);

  if (task === 'pulverizar' || task === 'fumigar') {
    if (rain > 0) {
      return { 
        status: 'red', 
        message: `No apto: Lluvia activa (${rain} mm). Lavado total del producto aplicado.`,
        action: 'Suspender aplicación y esperar secado de follaje.'
      };
    }
    if (wind > SPRAY_THRESHOLDS.criticalWind || gusts > 28) {
      return { 
        status: 'red', 
        message: `No apto: Viento extremo (${wind} km/h, Ráfagas ${gusts} km/h). Severo riesgo de deriva off-target.`,
        action: 'Interrumpir labores. Riesgo de fitotoxicidad a lotes vecinos y pérdida de producto.'
      };
    }
    if (temp > SPRAY_THRESHOLDS.maxTemp) {
      return { 
        status: 'red', 
        message: `No apto: Temperatura excesiva (${temp}°C). Evaporación violenta y estrés en cultivo.`,
        action: 'Diferir para horas nocturnas o primeras horas de la mañana con temperaturas < 25°C.'
      };
    }
    if (deltaT > 10) {
      return { 
        status: 'red', 
        message: `No apto: Delta T crítico (${deltaT}°C). Pérdida de caldo por evaporación en vuelo.`,
        action: 'Esperar a que baje la temperatura o suba la humedad relativa.'
      };
    }
    if (wind < SPRAY_THRESHOLDS.minWind) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Viento calmo (${wind} km/h). Alto riesgo de Inversión Térmica.`,
        action: 'Verificar humo/polvo en el lote. Las microgotas pueden flotar y desplazarse km.'
      };
    }
    if (wind > SPRAY_THRESHOLDS.idealMaxWind) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Viento al límite (${wind} km/h, Ráfagas ${gusts} km/h).`,
        action: 'Obligatorio: utilizar pastillas antideriva con aire inducido (AI) y bajar botalón.'
      };
    }
    if (hum < SPRAY_THRESHOLDS.minHum || deltaT > 8) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Aire seco (HR ${hum}%, ΔT ${deltaT}°C).`,
        action: 'Incorporar aceite coadyuvante antievaporante y calibrar tamaño de gota medio/grueso.'
      };
    }
    return { 
      status: 'green', 
      message: `100% Apto: Condiciones atmosféricas ideales para fumigación y pulverización de precisión.`,
      action: 'Ventana operativa abierta. Calibrar presión estándar y avanzar con la labor.'
    };
  }

  if (task === 'cosechar') {
    if (rain > 0) {
      return { 
        status: 'red', 
        message: `No apto: Lluvia activa (${rain} mm). Trilla suspendida por humedad en espiga/vaina.`,
        action: 'Aguardar secado natural del grano y del rastrojo.'
      };
    }
    if (hum > 75) {
      return { 
        status: 'red', 
        message: `No apto: Humedad ambiente excesiva (${hum}%). Riesgo de grano con sobrehumedad comercial.`,
        action: 'Evitar ingreso de cosechadoras para eludir penalidades en acopio y costos de secadora.'
      };
    }
    if (hum > 65) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Humedad límite (${hum}%). Monitorear humedad de grano en tolva.`,
        action: 'Cosechar solo lotes con destino a secado propio o grano resistente al desgrane.'
      };
    }
    return { 
      status: 'green', 
      message: `100% Apto: Humedad ambiente óptima (${hum}%) para trilla limpia y bajo porcentaje de rotura.`,
      action: 'Aprovechar la franja de mayor radiación solar para maximizar hectáreas recolectadas.'
    };
  }

  return { status: 'yellow', message: 'Sin datos para esta labor.', action: '' };
};

/**
 * Evaluates Daily Harvest conditions.
 */
export const evaluateDailyHarvest = (rainSum, maxHum, minHum) => {
  if (rainSum > 1) {
    return { status: 'red', label: 'No Apto', reason: `Lluvias previstas (${rainSum} mm). Interrupción de trilla.` };
  }
  if (rainSum > 0) {
    return { status: 'yellow', label: 'Incierto', reason: `Lloviznas débiles (${rainSum} mm). Retrasa el arranque.` };
  }
  if (minHum !== undefined && minHum > 70) {
    return { status: 'red', label: 'No Apto', reason: `Humedad mínima del día muy alta (${minHum}%). Grano no seca.` };
  }
  if (maxHum > 80 && minHum > 60) {
    return { status: 'yellow', label: 'Precaución', reason: `Día húmedo (Mín ${minHum}%). Ventana reducida de trilla.` };
  }
  return { status: 'green', label: 'Apto', reason: 'Excelente secado ambiental, apto para cosecha fluida.' };
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
  if (wind > SPRAY_THRESHOLDS.criticalWind || gusts > 26) {
    return { status: 'red', label: 'Viento Crítico', reason: `Viento ${wind} km/h (Ráfagas ${gusts} km/h)` };
  }
  if (temp > SPRAY_THRESHOLDS.maxTemp) {
    return { status: 'red', label: 'Calor Extremo', reason: `Temperatura alta (${temp}°C)` };
  }
  if (deltaT > 10) {
    return { status: 'red', label: 'Delta T Alto', reason: `Delta T crítico (${deltaT}°C)` };
  }

  if (wind < SPRAY_THRESHOLDS.minWind) {
    return { status: 'yellow', label: 'Viento Calmo', reason: `Viento < 3 km/h (Riesgo Inversión)` };
  }
  if (wind > SPRAY_THRESHOLDS.idealMaxWind) {
    return { status: 'yellow', label: 'Viento Límite', reason: `Viento ${wind} km/h (Exige antideriva)` };
  }
  if (temp > 27 || hum < 40 || deltaT > 8) {
    return { status: 'yellow', label: 'Evaporación', reason: `ΔT ${deltaT}°C • HR ${hum}% (Usar antievaporante)` };
  }

  return { status: 'green', label: 'Óptimo', reason: 'Condiciones perfectas para aplicar' };
};

/**
 * Recommends spray nozzle type based on current wind, delta T, and humidity.
 */
export const getSprayNozzleRecommendation = (windSpeed, deltaT, gusts) => {
  const w = windSpeed ?? 0;
  const g = gusts ?? w;
  const dt = deltaT ?? 5;

  if (w > SPRAY_THRESHOLDS.criticalWind || g > 28) {
    return {
      nozzleType: 'Aplicación No Recomendada',
      pressure: '--',
      dropletSize: 'N/A',
      additive: 'Detener pulverizadora',
      details: 'El viento excede los parámetros seguros de deriva.'
    };
  }

  if (w > 14 || g > 18) {
    return {
      nozzleType: 'Aire Inducido / Antideriva (AI / TTI / IDK)',
      pressure: '3.0 - 4.5 bar',
      dropletSize: 'Muy Gruesa a Extremadamente Gruesa (XC)',
      additive: 'Antideriva + Tensioactivo organosiliconado',
      details: 'Gotas con burbujas de aire que reducen deriva un 90% a alta velocidad de viento.'
    };
  }

  if (dt > 8 || w > 10) {
    return {
      nozzleType: 'Cono Hueco Antideriva o Abanico Plano con Inducción',
      pressure: '2.5 - 3.5 bar',
      dropletSize: 'Gruesa a Muy Gruesa (Coarse / VC)',
      additive: 'Coadyuvante Antievaporante (aceite metilado MSO al 0.5-1%)',
      details: 'Protege las gotas del encogimiento por calor y baja humedad.'
    };
  }

  if (w >= 3 && w <= 10 && dt >= 2 && dt <= 8) {
    return {
      nozzleType: 'Abanico Plano Estándar (XR) o Cono Hueco',
      pressure: '2.0 - 3.0 bar',
      dropletSize: 'Mediana (Medium, 200-300 micrones)',
      additive: 'Humectante / Penetrante estándar',
      details: 'Máxima cobertura e impactos por cm² para fungicidas e insecticidas de contacto.'
    };
  }

  return {
    nozzleType: 'Abanico Antideriva de Baja Presión (DG)',
    pressure: '2.0 - 3.0 bar',
    dropletSize: 'Gruesa',
    additive: 'Coadyuvante estándar',
    details: 'Viento en rango bajo; mantener gotas estables y monitorear inversión.'
  };
};

/**
 * Calculates Dew Point margin and dew presence risk for harvest and spraying.
 */
export const evaluateDewRisk = (temp, dewPoint, hum) => {
  if (temp === undefined || dewPoint === undefined) return null;
  const diff = Math.round((temp - dewPoint) * 10) / 10;

  if (diff <= 1.5 || hum > 90) {
    return {
      status: 'red',
      level: 'Rocío Activo / Escarcha',
      diff,
      advice: 'Hojas mojadas: no pulverizar productos sistémicos (riesgo de escurrimiento al suelo) ni cosechar (grano empapado).'
    };
  }
  if (diff <= 3.0 || hum > 80) {
    return {
      status: 'yellow',
      level: 'Rocío Inminente',
      diff,
      advice: 'Humedad próxima a condensar. La labor de cosecha debe ir cerrando por humedad ascendente.'
    };
  }
  return {
    status: 'green',
    level: 'Follaje Seco',
    diff,
    advice: 'Amplio margen sobre punto de rocío. Excelente para trilla limpia y adherencia foliar.'
  };
};

/**
 * Evaluates Harvest Moisture Index for grain crops.
 */
export const evaluateHarvestConditions = (rain, hum, temp, dewPoint) => {
  const r = rain ?? 0;
  const h = hum ?? 50;
  const t = temp ?? 20;

  if (r > 0) {
    return {
      status: 'red',
      verdict: 'Cosecha Imposible (Lluvia activa)',
      advice: 'Lluvia directa sobre el cultivo. Parada total de cosechadoras y tolvas.'
    };
  }
  if (h > 75) {
    return {
      status: 'red',
      verdict: 'Sobrehumedad en Grano',
      advice: `Humedad de aire muy alta (${h}%). Grano por encima del límite comercial de recibo.`
    };
  }
  if (h > 65) {
    return {
      status: 'yellow',
      verdict: 'Ventana Límite / Humedad Media',
      advice: `HR de ${h}%. Requiere control constante con humidímetro portátil en tolva.`
    };
  }
  if (t < 14) {
    return {
      status: 'yellow',
      verdict: 'Temperatura Fresca',
      advice: `Baja evaporación (${t}°C). El secado del rocío matinal puede retrasarse.`
    };
  }
  return {
    status: 'green',
    verdict: 'Óptimo para Cosecha Comercial',
    advice: `HR ${h}% y ${t}°C. Grano seco con mínima merma por rotura y entrega directa sin secado.`
  };
};

/**
 * Evaluates Rainfastness / Lavado por lluvia post-aplicación.
 */
export const evaluateRainfastness = (hourlyRainNext6h) => {
  const rainNext6h = hourlyRainNext6h?.reduce((a, b) => a + b, 0) || 0;
  if (rainNext6h >= 5) {
    return {
      status: 'red',
      hoursToRain: '< 6 horas',
      risk: 'Peligro Crítico de Lavado',
      advice: `Se prevén ${rainNext6h.toFixed(1)} mm en las próximas 6h. No aplicar: el agua lavará el 80-100% del activo.`
    };
  }
  if (rainNext6h > 0.5) {
    return {
      status: 'yellow',
      hoursToRain: '< 6 horas',
      risk: 'Riesgo Moderado de Lavado',
      advice: `Lluvias débiles pronosticadas (${rainNext6h.toFixed(1)} mm). Utilizar formulaciones con resina pegante/adherente de rápido secado.`
    };
  }
  return {
    status: 'green',
    hoursToRain: '> 6 horas',
    risk: 'Sin Riesgo de Lavado',
    advice: 'Al menos 6 horas libres de precipitaciones. Tiempo óptimo para absorción y fijación cuticular.'
  };
};

/**
 * Analyzes full week weather for Spraying & Harvesting operational windows.
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
    let maxHumOfDay = 0;
    let minHumOfDay = 100;

    for (let h = 0; h < hourly.time.length; h++) {
      const timeStr = hourly.time[h];
      if (timeStr.startsWith(dayDateStr)) {
        const temp = hourly.temperature_2m[h];
        const hum = hourly.relative_humidity_2m[h];
        const wind = hourly.wind_speed_10m[h];
        const gusts = hourly.wind_gusts_10m[h];
        const rain = hourly.precipitation[h];
        const windDir = hourly.wind_direction_10m ? hourly.wind_direction_10m[h] : 0;
        const dewPoint = hourly.dew_point_2m ? hourly.dew_point_2m[h] : null;
        const soilTemp = hourly.soil_temperature_0cm ? hourly.soil_temperature_0cm[h] : null;
        const soilMoisture = hourly.soil_moisture_0_to_1cm ? hourly.soil_moisture_0_to_1cm[h] : null;
        const et0 = hourly.et0_fao_evapotranspiration ? hourly.et0_fao_evapotranspiration[h] : null;
        const hourNum = new Date(timeStr).getHours();

        if (hum > maxHumOfDay) maxHumOfDay = hum;
        if (hum < minHumOfDay) minHumOfDay = hum;

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
          windDir,
          dewPoint,
          soilTemp,
          soilMoisture,
          et0,
          eval: evalResult
        });
      }
    }

    // Daylight working hours (06:00 to 21:00)
    const workDayHours = dayHours.filter(item => item.hourNum >= 6 && item.hourNum <= 21);
    
    const greenHours = workDayHours.filter(item => item.eval.status === 'green');
    const yellowHours = workDayHours.filter(item => item.eval.status === 'yellow');
    const redHours = workDayHours.filter(item => item.eval.status === 'red');

    // Continuous operational windows for Fumigar / Pulverizar
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

    // Harvest windows (11:00 to 19:00, rain === 0, hum <= 65)
    const harvestWindowsList = [];
    let currentHarvestWin = [];
    workDayHours.filter(item => item.hourNum >= 11 && item.hourNum <= 19).forEach(item => {
      if (item.rain === 0 && item.hum <= 65) {
        currentHarvestWin.push(item);
      } else {
        if (currentHarvestWin.length >= 2) {
          const startH = currentHarvestWin[0].hourNum.toString().padStart(2, '0');
          const endH = (currentHarvestWin[currentHarvestWin.length - 1].hourNum + 1).toString().padStart(2, '0');
          harvestWindowsList.push(`${startH}:00 a ${endH}:00 hs`);
        }
        currentHarvestWin = [];
      }
    });
    if (currentHarvestWin.length >= 2) {
      const startH = currentHarvestWin[0].hourNum.toString().padStart(2, '0');
      const endH = (currentHarvestWin[currentHarvestWin.length - 1].hourNum + 1).toString().padStart(2, '0');
      harvestWindowsList.push(`${startH}:00 a ${endH}:00 hs`);
    }

    // Wind shifts timeline for key day periods (08:00, 14:00, 20:00)
    const morningSlot = dayHours.find(h => h.hourNum === 8) || dayHours[8];
    const afternoonSlot = dayHours.find(h => h.hourNum === 14) || dayHours[14];
    const eveningSlot = dayHours.find(h => h.hourNum === 20) || dayHours[20];

    const windShifts = [
      {
        period: 'Mañana (08:00 hs)',
        dir: getWindDirectionName(morningSlot?.windDir),
        speed: morningSlot?.wind ?? 0,
        gusts: morningSlot?.gusts ?? 0
      },
      {
        period: 'Tarde (14:00 hs)',
        dir: getWindDirectionName(afternoonSlot?.windDir),
        speed: afternoonSlot?.wind ?? 0,
        gusts: afternoonSlot?.gusts ?? 0
      },
      {
        period: 'Noche (20:00 hs)',
        dir: getWindDirectionName(eveningSlot?.windDir),
        speed: eveningSlot?.wind ?? 0,
        gusts: eveningSlot?.gusts ?? 0
      }
    ];

    // Rain schedule identification
    const rainHours = dayHours.filter(h => h.rain > 0);
    let rainSchedule = null;
    if (rainHours.length > 0) {
      const firstRainH = rainHours[0].hourNum.toString().padStart(2, '0');
      const lastRainH = (rainHours[rainHours.length - 1].hourNum + 1).toString().padStart(2, '0');
      rainSchedule = `${firstRainH}:00 a ${lastRainH}:00 hs`;
    }

    // Non operational reasons
    const nonOpReasons = [];
    const highWindHours = workDayHours.filter(h => h.wind > SPRAY_THRESHOLDS.criticalWind || h.gusts > 26);
    const rainDayHours = workDayHours.filter(h => h.rain > 0);
    const extremeHeatHours = workDayHours.filter(h => h.temp > SPRAY_THRESHOLDS.maxTemp);
    const deltaTReds = workDayHours.filter(h => calculateDeltaT(h.temp, h.hum).deltaT > 10);

    if (rainDayHours.length > 0) nonOpReasons.push(`Lluvias en ${rainDayHours.length} hs diurnas`);
    if (highWindHours.length > 0) nonOpReasons.push(`Viento/Ráfagas excesivas en ${highWindHours.length} hs`);
    if (extremeHeatHours.length > 0) nonOpReasons.push(`Calor > 30°C en ${extremeHeatHours.length} hs`);
    if (deltaTReds.length > 0) nonOpReasons.push(`Delta T crítico en ${deltaTReds.length} hs`);

    let overallStatus = 'green';
    if (greenHours.length >= 6) {
      overallStatus = 'green';
    } else if (greenHours.length + yellowHours.length >= 3) {
      overallStatus = 'yellow';
    } else {
      overallStatus = 'red';
    }

    // Evaluate Cosecha for this day
    const harvestEval = {
      ...evaluateDailyHarvest(daily.precipitation_sum[d], maxHumOfDay, minHumOfDay),
      windows: harvestWindowsList
    };

    daysAnalysis.push({
      dayIndex: d,
      dateStr: dayDateStr,
      weatherCode: daily.weather_code[d],
      sunrise,
      sunset,
      greenCount: greenHours.length,
      yellowCount: yellowHours.length,
      redCount: redHours.length,
      overallStatus,
      windows: windowsStrList.length > 0 ? windowsStrList : [],
      isOperational: windowsStrList.length > 0 && overallStatus !== 'red',
      nonOperationalReason: nonOpReasons.length > 0 ? nonOpReasons.join(' • ') : 'Condiciones estables sin impedimentos climáticos.',
      windShifts,
      harvestEval,
      maxWind: daily.wind_speed_10m_max[d],
      maxGust: daily.wind_gusts_10m_max[d],
      rainSum: daily.precipitation_sum[d],
      rainSchedule,
      maxTemp: daily.temperature_2m_max[d],
      minTemp: daily.temperature_2m_min[d],
      et0: daily.et0_fao_evapotranspiration ? daily.et0_fao_evapotranspiration[d] : null,
      uvMax: daily.uv_index_max ? daily.uv_index_max[d] : null,
      hours: dayHours
    });
  }

  // Best day for Fumigar / Pulverizar
  const sortedFumigar = [...daysAnalysis].sort((a, b) => {
    if (b.greenCount !== a.greenCount) return b.greenCount - a.greenCount;
    if (a.rainSum !== b.rainSum) return a.rainSum - b.rainSum;
    return a.maxWind - b.maxWind;
  });

  // Best day for Cosechar
  const sortedCosechar = [...daysAnalysis].sort((a, b) => {
    const statusScore = { green: 3, yellow: 2, red: 1 };
    if (statusScore[b.harvestEval.status] !== statusScore[a.harvestEval.status]) {
      return statusScore[b.harvestEval.status] - statusScore[a.harvestEval.status];
    }
    if (a.rainSum !== b.rainSum) return a.rainSum - b.rainSum;
    return a.maxWind - b.maxWind;
  });

  return {
    days: daysAnalysis,
    bestDayOfWeek: sortedFumigar[0],
    bestDayFumigar: sortedFumigar[0],
    bestDayCosechar: sortedCosechar[0],
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
      advice: 'Calma absoluta (viento < 3 km/h). Las gotas quedan flotando en suspensión y se desplazan kilómetros causando daño deriva.'
    };
  } else if (windSpeed >= 3 && windSpeed <= 6) {
    return {
      status: 'yellow',
      title: 'Riesgo Moderado de Inversión',
      advice: 'Atención al amanecer o caída del sol. Monitorear dirección del humo o polvo de las ruedas.'
    };
  } else {
    return {
      status: 'green',
      title: 'Bajo Riesgo de Inversión',
      advice: 'Viento con mezcla vertical continua de aire. Sin inversión térmica peligrosa.'
    };
  }
};

/**
 * Evaluates Soil Trafficability (Piso en Lote para maquinaria pesada).
 */
export const evaluateSoilTrafficability = (precip, hum, soilMoisture) => {
  if (precip === undefined) return null;

  // If soil moisture available (m³/m³, normal range 0.15 - 0.50)
  if (soilMoisture !== undefined && soilMoisture !== null) {
    if (soilMoisture > 0.42 || precip > 15) {
      return {
        status: 'red',
        title: 'Piso Saturado / Barro Pesado',
        moistureVal: `${Math.round(soilMoisture * 100)}% vol`,
        advice: 'Suelo saturado de agua. Alto riesgo de empantanamiento de pulverizadoras autopropulsadas y cosechadoras.'
      };
    }
    if (soilMoisture > 0.33 || precip > 3) {
      return {
        status: 'yellow',
        title: 'Piso Húmedo / Compactación',
        moistureVal: `${Math.round(soilMoisture * 100)}% vol`,
        advice: 'Ingresar con neumáticos de flotación o baja presión. Precaución en bajos del lote.'
      };
    }
    return {
      status: 'green',
      title: 'Piso Firme / Óptima Transitabilidad',
      moistureVal: `${Math.round(soilMoisture * 100)}% vol`,
      advice: 'Suelo con excelente sustentación. Tránsito sin deformación de huella ni compactación.'
    };
  }

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
      advice: `Temperaturas bajo cero (${lowest}°C). Alto riesgo en hojas y espigas tiernas.`
    };
  } else if (lowest <= 3) {
    return {
      status: 'yellow',
      title: 'Riesgo de Helada Agronómica',
      advice: `Temperatura cerca del suelo (${lowest}°C). Posible escarcha en bajos de campo.`
    };
  } else {
    return {
      status: 'green',
      title: 'Sin Riesgo de Heladas',
      advice: 'Temperaturas por encima del umbral de daño por frío.'
    };
  }
};
