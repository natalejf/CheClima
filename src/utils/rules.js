import { getWindDirectionName, getSouthernHemisphereSeason } from './weather';

/**
 * Agricultural Rules & Operational Windows Engine
 * Evaluates weather and agronomic conditions for Fumigación, Pulverización, and Cosecha.
 * Incorporates multi-day accumulated rainfall (piso en lote y humedad de rastrojo),
 * Southern Hemisphere seasonal agronomic stage, and simplified plain-language explanations.
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
  if (temp === undefined || hum === undefined) return { deltaT: 0, status: 'yellow', zone: 'Sin datos', advice: '', simpleExp: '' };

  const T = temp;
  const RH = hum;
  const Tw = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
             Math.atan(T + RH) - Math.atan(RH - 1.676331) +
             0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;

  const deltaT = Math.round((T - Tw) * 10) / 10;

  let status = 'green';
  let zone = 'Óptimo (2°C - 8°C)';
  let advice = 'Excelente balance entre evaporación y vida útil de la gota.';
  let simpleExp = 'Condición perfecta: el producto llega a la planta sin evaporarse.';

  if (deltaT < 2) {
    status = 'yellow';
    zone = 'Bajo (< 2°C)';
    advice = 'Poca evaporación pero ALTO RIESGO de Inversión Térmica y gotas suspendidas.';
    simpleExp = 'Aire muy húmedo o frío: las gotas flotan sin caer y pueden viajar lejos por deriva.';
  } else if (deltaT >= 2 && deltaT <= 8) {
    status = 'green';
    zone = 'Óptimo (2°C - 8°C)';
    advice = 'Condiciones excelentes para absorción y persistencia del caldo.';
    simpleExp = 'Condición ideal de pulverización.';
  } else if (deltaT > 8 && deltaT <= 10) {
    status = 'yellow';
    zone = 'Precaución (8°C - 10°C)';
    advice = 'Usar gotas medianas a gruesas y coadyuvante antievaporante (aceite mineral/vegetal).';
    simpleExp = 'Aire seco: gotas chicas se evaporan en el aire. Usar gotas más grandes y aceite.';
  } else {
    status = 'red';
    zone = 'Crítico (> 10°C)';
    advice = 'Evaporación extrema. La gota se evapora antes de depositarse en el blanco.';
    simpleExp = 'Mucho calor y aire seco: el agroquímico se esfuma antes de tocar la maleza o cultivo.';
  }

  return { deltaT, status, zone, advice, simpleExp };
};

/**
 * Evaluates general task conditions: Fumigar, Pulverizar, Cosechar.
 * Considers current weather, recent accumulated rainfall (past 3 days), and seasonal context.
 */
export const evaluateConditions = (task, current, recentRainSum = 0) => {
  if (!current) return { status: 'yellow', message: 'Cargando datos...', action: '', seasonNote: '' };

  const {
    temperature_2m: temp,
    relative_humidity_2m: hum,
    wind_speed_10m: wind,
    wind_gusts_10m: gusts,
    precipitation: rain
  } = current;

  const { deltaT } = calculateDeltaT(temp, hum);
  const season = getSouthernHemisphereSeason();

  if (task === 'pulverizar' || task === 'fumigar') {
    // Current active rain
    if (rain > 0) {
      return { 
        status: 'red', 
        message: `No apto: Lluvia activa (${rain} mm). Lavado total del producto aplicado.`,
        action: 'Suspender aplicación y esperar a que el cultivo seque completamente.',
        seasonNote: `Época: ${season.name}. Lluvias activas lavan cualquier fitosanitario.`
      };
    }

    // Heavy recent rain making ground untrafficable or plants waterlogged
    if (recentRainSum > 35) {
      return {
        status: 'red',
        message: `No apto por suelo: Llovieron ${recentRainSum.toFixed(1)} mm en los últimos 3 días. Suelo anegado o muy blando.`,
        action: 'No ingresar con maquinaria autopropulsada pesada. Esperar que oree el lote.',
        seasonNote: `Época: ${season.name}. Riesgo crítico de encajar la pulverizadora.`
      };
    }

    // Wind extremes
    if (wind > SPRAY_THRESHOLDS.criticalWind || gusts > 28) {
      return { 
        status: 'red', 
        message: `No apto: Viento excesivo (${wind} km/h, Ráfagas ${gusts} km/h). Severo riesgo de deriva off-target.`,
        action: 'Interrumpir labores. El viento arrastra el producto fuera del lote.',
        seasonNote: `Época: ${season.name}. Cuidar cultivos linderos y cortinas forestales.`
      };
    }

    // Heat extremes
    if (temp > SPRAY_THRESHOLDS.maxTemp) {
      return { 
        status: 'red', 
        message: `No apto: Mucho calor (${temp}°C). Evaporación violenta y estrés en cultivo.`,
        action: 'Diferir para la noche o primera hora de la mañana con temperaturas < 25°C.',
        seasonNote: `Típico de ${season.name}: el calor evapora la gota antes de penetrar.`
      };
    }

    // High Delta T
    if (deltaT > 10) {
      return { 
        status: 'red', 
        message: `No apto: Delta T crítico (${deltaT}°C). Pérdida de caldo por evaporación en vuelo.`,
        action: 'Esperar a que baje la temperatura o suba la humedad relativa.',
        seasonNote: 'El producto pierde eficacia y volumen en pleno vuelo.'
      };
    }

    // Calms and thermal inversion
    if (wind < SPRAY_THRESHOLDS.minWind) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Viento casi nulo (${wind} km/h). Riesgo de Inversión Térmica.`,
        action: 'Verificar si el humo queda flotando en capas horizontales. No aplicar productos volátiles.',
        seasonNote: `Al amanecer o atardecer en ${season.name}, el aire frío queda atrapado abajo.`
      };
    }

    // Recent rain warning (between 15 and 35 mm)
    if (recentRainSum > 15) {
      return {
        status: 'yellow',
        message: `Apto con precaución: ${recentRainSum.toFixed(1)} mm acumulados recientes. Piso húmedo en cabeceras y bajos.`,
        action: 'Entrar con rodado ancho o menor carga de tanque para no compactar.',
        seasonNote: `Monitorear sectores bajos del lote.`
      };
    }

    // Limit wind
    if (wind > SPRAY_THRESHOLDS.idealMaxWind) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Viento al límite (${wind} km/h, Ráfagas ${gusts} km/h).`,
        action: 'Obligatorio usar pastillas antideriva con aire inducido (AI) y bajar la altura del botalón.',
        seasonNote: `Ajustar altura de barra a 50 cm del canopeo.`
      };
    }

    // Dry air
    if (hum < SPRAY_THRESHOLDS.minHum || deltaT > 8) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Aire seco (Humedad ${hum}%, ΔT ${deltaT}°C).`,
        action: 'Agregar aceite coadyuvante antievaporante y calibrar tamaño de gota medio/grueso.',
        seasonNote: `El aceite protege la gota durante el recorrido hacia el objetivo.`
      };
    }

    return { 
      status: 'green', 
      message: `100% Apto: Condiciones climáticas y de suelo ideales para fumigación y pulverización de precisión.`,
      action: 'Ventana óptima abierta. Trabajar con presión estándar y avanzar normalmente.',
      seasonNote: `Contexto ${season.name}: óptima asimilación cuticular del activo.`
    };
  }

  if (task === 'cosechar') {
    if (rain > 0) {
      return { 
        status: 'red', 
        message: `No apto: Lluvia activa (${rain} mm). Trilla suspendida por humedad en planta y grano.`,
        action: 'Aguardar secado natural del cultivo y del rastrojo.',
        seasonNote: `Campaña en ${season.name}: el grano húmedo no ingresa al circuito comercial.`
      };
    }

    // If more than 20mm fell in recent 3 days
    if (recentRainSum > 20) {
      return {
        status: 'red',
        message: `No apto por piso y planta: ${recentRainSum.toFixed(1)} mm acumulados en los últimos 3 días. Rastrojo y suelo saturados.`,
        action: 'Aguardar oreo de suelo y secado de panoja/vaina. Riesgo de enterrar cosechadora y tolvas.',
        seasonNote: `Época de ${season.name}: controlar humedad con calador antes de meter la máquina.`
      };
    }

    if (recentRainSum > 8) {
      return {
        status: 'yellow',
        message: `Precaución: ${recentRainSum.toFixed(1)} mm caídos recientemente. El grano puede mantener humedad superficial.`,
        action: 'Medir porcentaje de humedad con humidímetro en tolva antes de avanzar a lote completo.',
        seasonNote: `Monitorear sectores con rastrojo denso que tardan más en secar.`
      };
    }

    if (hum > 75) {
      return { 
        status: 'red', 
        message: `No apto: Humedad ambiente alta (${hum}%). Riesgo de grano con sobrehumedad comercial.`,
        action: 'Esperar que el sol baje la humedad ambiental para evitar descuentos y secadora en acopio.',
        seasonNote: `En ${season.name}, la trilla suele abrirse recién después de las 11:30 hs.`
      };
    }

    if (hum > 65) {
      return { 
        status: 'yellow', 
        message: `Apto con precaución: Humedad límite (${hum}%). Monitorear humedad de grano en tolva.`,
        action: 'Cosechar lotes prioritarios con secadora disponible o variedades resistentes a desgrane.',
        seasonNote: `Vigilar si el ambiente se seca a media tarde.`
      };
    }

    return { 
      status: 'green', 
      message: `100% Apto: Humedad ambiente óptima (${hum}%) para cosecha limpia, grano seco y bajo daño mecánico.`,
      action: 'Aprovechar las horas de máxima radiación para avanzar el mayor número de hectáreas.',
      seasonNote: `Condición excelente para entrega directa a puerto o silo sin costo de secado.`
    };
  }

  return { status: 'yellow', message: 'Sin datos para esta labor.', action: '', seasonNote: '' };
};

/**
 * Evaluates Daily Harvest conditions.
 */
export const evaluateDailyHarvest = (rainSum, maxHum, minHum, recentRain = 0) => {
  if (rainSum > 1) {
    return { status: 'red', label: 'No Apto', reason: `Lluvias previstas (${rainSum} mm). Interrupción de trilla.` };
  }
  if (recentRain > 25) {
    return { status: 'red', label: 'Piso Pesado', reason: `Lluvias previas (${recentRain.toFixed(1)} mm). Suelo húmedo para cosechadora.` };
  }
  if (rainSum > 0) {
    return { status: 'yellow', label: 'Incierto', reason: `Lloviznas débiles previstas (${rainSum} mm). Retrasa el arranque.` };
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
      details: 'El viento excede los parámetros seguros de deriva.',
      whyExplain: 'El viento fuerte vuela el agroquímico a los campos vecinos. Parar la máquina evita que pierdas plata y quemes otros lotes.'
    };
  }

  if (w > 14 || g > 18) {
    return {
      nozzleType: 'Aire Inducido / Antideriva (AI / TTI / IDK)',
      pressure: '3.0 - 4.5 bar',
      dropletSize: 'Muy Gruesa a Extremadamente Gruesa (XC)',
      additive: 'Antideriva + Tensioactivo organosiliconado',
      details: 'Gotas con burbujas de aire que reducen deriva un 90% a alta velocidad de viento.',
      whyExplain: 'Pastillas con burbujas de aire adentro: hacen gotas pesadas que caen directo al suelo y no se vuelan con las ráfagas.'
    };
  }

  if (dt > 8 || w > 10) {
    return {
      nozzleType: 'Cono Hueco Antideriva o Abanico Plano con Inducción',
      pressure: '2.5 - 3.5 bar',
      dropletSize: 'Gruesa a Muy Gruesa (Coarse / VC)',
      additive: 'Coadyuvante Antievaporante (aceite metilado MSO al 0.5-1%)',
      details: 'Protege las gotas del encogimiento por calor y baja humedad.',
      whyExplain: 'El calor y aire seco evaporan las gotas chicas en el camino. Con aceite y gotas más gruesas el caldo llega intacto.'
    };
  }

  if (w >= 3 && w <= 10 && dt >= 2 && dt <= 8) {
    return {
      nozzleType: 'Abanico Plano Estándar (XR) o Cono Hueco',
      pressure: '2.0 - 3.0 bar',
      dropletSize: 'Mediana (Medium, 200-300 micrones)',
      additive: 'Humectante / Penetrante estándar',
      details: 'Máxima cobertura e impactos por cm² para fungicidas e insecticidas de contacto.',
      whyExplain: 'Clima ideal: podés usar pastillas comunes de abanico plano que dan muchas gotas por centímetro cuadrado y cubren toda la hoja.'
    };
  }

  return {
    nozzleType: 'Abanico Antideriva de Baja Presión (DG)',
    pressure: '2.0 - 3.0 bar',
    dropletSize: 'Gruesa',
    additive: 'Coadyuvante estándar',
    details: 'Viento en rango bajo; mantener gotas estables y monitorear inversión.',
    whyExplain: 'Viento suave: mantener gotas estables y vigilar que no caiga el viento a cero (calma chicha).'
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
      level: 'Rocío Activo / Follaje Mojado',
      diff,
      advice: 'Hojas mojadas: no pulverizar productos sistémicos (el caldo resbala y chorrea al suelo) ni cosechar (grano empapado).',
      simpleExp: 'El pasto y las hojas están con gotas de rocío. Si aplicás ahora, el remedio chorrea y se pierde. Si trillás, el grano sale con agua.'
    };
  }
  if (diff <= 3.0 || hum > 80) {
    return {
      status: 'yellow',
      level: 'Rocío Inminente',
      diff,
      advice: 'Humedad próxima a condensar. La labor de cosecha debe ir cerrando por humedad ascendente en vainas/panojas.',
      simpleExp: 'Se viene el rocío de la tardecita. La humedad está subiendo rápido; conviene ir redondeando la trilla.'
    };
  }
  return {
    status: 'green',
    level: 'Follaje Seco',
    diff,
    advice: 'Amplio margen sobre punto de rocío. Excelente para trilla limpia y máxima adherencia del pulverizado.',
    simpleExp: 'Hojas y espigas secas al 100%. Lo que tires se pega a la hoja, y la cosechadora trilla sin atorarse.'
  };
};

/**
 * Evaluates Harvest Moisture Index for grain crops.
 */
export const evaluateHarvestConditions = (rain, hum, temp, dewPoint, recentRain = 0) => {
  const r = rain ?? 0;
  const h = hum ?? 50;
  const t = temp ?? 20;

  if (r > 0) {
    return {
      status: 'red',
      verdict: 'Cosecha Imposible (Lluvia activa)',
      advice: 'Lluvia directa sobre el cultivo. Parada total de cosechadoras y tolvas.',
      simpleExp: 'Lluvia cayendo: imposible trillar.'
    };
  }
  if (recentRain > 25) {
    return {
      status: 'red',
      verdict: 'Suelo Saturado por Lluvias Previas',
      advice: `Llovieron ${recentRain.toFixed(1)} mm en los últimos 3 días. Suelo demasiado blando para peso de tolvas y cosechadora.`,
      simpleExp: `El suelo está blando por los ${recentRain.toFixed(1)} mm caídos días atrás. Riesgo de enterrar la maquinaria.`
    };
  }
  if (h > 75) {
    return {
      status: 'red',
      verdict: 'Sobrehumedad en Grano',
      advice: `Humedad de aire muy alta (${h}%). Grano por encima del estándar comercial de recibo (13.5% soja / 14.5% maíz).`,
      simpleExp: `Mucho vapor en el aire (${h}%): el grano absorbe humedad y en el acopio te van a cobrar secada o rechazar el camión.`
    };
  }
  if (h > 65) {
    return {
      status: 'yellow',
      verdict: 'Ventana Límite / Humedad Media',
      advice: `Humedad ambiente de ${h}%. Requiere control constante con humidímetro portátil en tolva.`,
      simpleExp: 'Humedad al borde: medí una muestra de la tolva con el tester antes de llenar el camión.'
    };
  }
  if (t < 14) {
    return {
      status: 'yellow',
      verdict: 'Temperatura Fresca',
      advice: `Baja evaporación (${t}°C). El secado del rocío matinal puede retrasarse.`,
      simpleExp: 'Día fresco: tarda más en secarse el rocío de la mañana.'
    };
  }
  return {
    status: 'green',
    verdict: 'Óptimo para Cosecha Comercial',
    advice: `Humedad de aire ${h}% y ${t}°C. Grano seco con mínima merma por rotura y entrega directa sin secado.`,
    simpleExp: 'Condición ideal: el grano está en humedad justa para entrega directa sin que te cobren secado.'
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
      advice: `Se prevén ${rainNext6h.toFixed(1)} mm en las próximas 6h. No aplicar: el agua lavará el 80-100% del activo.`,
      simpleExp: 'Va a llover pronto: la lluvia va a lavar todo el veneno o abono foliar que tires. No tires plata.'
    };
  }
  if (rainNext6h > 0.5) {
    return {
      status: 'yellow',
      hoursToRain: '< 6 horas',
      risk: 'Riesgo Moderado de Lavado',
      advice: `Lluvias débiles pronosticadas (${rainNext6h.toFixed(1)} mm). Utilizar formulaciones con resina pegante/adherente de rápido secado.`,
      simpleExp: 'Hay chance de llovizna: usá un buen adherente siliconado para que la hoja lo chupe rápido.'
    };
  }
  return {
    status: 'green',
    hoursToRain: '> 6 horas',
    risk: 'Sin Riesgo de Lavado',
    advice: 'Al menos 6 horas libres de precipitaciones. Tiempo óptimo para absorción y fijación cuticular.',
    simpleExp: 'No llueve por las próximas 6 horas: tiempo de sobra para que la planta absorba el producto.'
  };
};

/**
 * Analyzes weather for Spraying & Harvesting operational windows.
 * Correctly distinguishes today (matches actual date string) and isolates 7-day forecast.
 */
export const analyzeWeeklySprayingWindows = (weatherData) => {
  if (!weatherData?.hourly || !weatherData?.daily) return null;

  const { hourly, daily } = weatherData;
  const daysAnalysis = [];

  // Determine today date string in YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;

  // Calculate recent rain sum from past days (dates before today)
  let recentRainSum = 0;
  for (let d = 0; d < daily.time.length; d++) {
    const dStr = daily.time[d];
    if (dStr < todayDateStr) {
      recentRainSum += (daily.precipitation_sum[d] || 0);
    }
  }

  // Iterate over days from today onward (or all if today not found)
  for (let d = 0; d < daily.time.length; d++) {
    const dayDateStr = daily.time[d];
    
    // Only analyze today and upcoming forecast days (skip past history in the forecast view)
    if (dayDateStr < todayDateStr) continue;

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
      ...evaluateDailyHarvest(daily.precipitation_sum[d], maxHumOfDay, minHumOfDay, d === 0 ? recentRainSum : 0),
      windows: harvestWindowsList
    };

    daysAnalysis.push({
      dayIndex: daysAnalysis.length,
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
    today: daysAnalysis[0] || null,
    recentRainSum
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
      advice: 'Calma absoluta (viento < 3 km/h). Las gotas quedan flotando en suspensión y se desplazan kilómetros causando daño deriva.',
      simpleExp: 'El viento está quieto (calma chicha). Las gotas no caen al lote, flotan como niebla y el viento suave se las lleva a cualquier lado.'
    };
  } else if (windSpeed >= 3 && windSpeed <= 6) {
    return {
      status: 'yellow',
      title: 'Riesgo Moderado de Inversión',
      advice: 'Atención al amanecer o caída del sol. Monitorear dirección del humo o polvo de las ruedas.',
      simpleExp: 'Poco viento. Si es de mañana temprano o al anochecer, mirá el polvo de las ruedas: si queda flotando, suspendé la aplicación.'
    };
  } else {
    return {
      status: 'green',
      title: 'Bajo Riesgo de Inversión',
      advice: 'Viento con mezcla vertical continua de aire. Sin inversión térmica peligrosa.',
      simpleExp: 'Buen movimiento de aire: el aire mezcla bien arriba y abajo. No hay inversión.'
    };
  }
};

/**
 * Evaluates Soil Trafficability (Piso en Lote para maquinaria pesada).
 * Integrates recent rainfall (3 past days) and volumetric soil moisture.
 */
export const evaluateSoilTrafficability = (precip, hum, soilMoisture, recentRainSum = 0) => {
  if (precip === undefined) return null;

  // Severe multi-day rain
  if (recentRainSum > 35 || precip > 15 || (soilMoisture !== undefined && soilMoisture > 0.42)) {
    return {
      status: 'red',
      title: 'Piso Saturado / Barro Pesado',
      moistureVal: soilMoisture ? `${Math.round(soilMoisture * 100)}% vol` : `${recentRainSum.toFixed(1)} mm caídos`,
      recentRain: `${recentRainSum.toFixed(1)} mm recientes`,
      advice: 'Suelo saturado de agua. Alto riesgo de encajar la pulverizadora autopropulsada, tractores y cosechadoras.',
      simpleExp: 'Hay barro o suelo blando por el agua acumulada. No metas máquinas pesadas porque te vas a enterrar o dejar huellas profundas.'
    };
  }

  // Moderate rain or damp soil
  if (recentRainSum > 12 || precip > 2 || (soilMoisture !== undefined && soilMoisture > 0.33)) {
    return {
      status: 'yellow',
      title: 'Piso Húmedo / Precaución en Bajos',
      moistureVal: soilMoisture ? `${Math.round(soilMoisture * 100)}% vol` : `${recentRainSum.toFixed(1)} mm caídos`,
      recentRain: `${recentRainSum.toFixed(1)} mm recientes`,
      advice: 'Ingresar con neumáticos de flotación o baja presión. Precaución en cabeceras y bajos del lote.',
      simpleExp: 'El suelo tiene humedad de las últimas lluvias. Se puede entrar pero con cuidado en las zonas bajas del potrero.'
    };
  }

  return {
    status: 'green',
    title: 'Piso Firme / Óptima Transitabilidad',
    moistureVal: soilMoisture ? `${Math.round(soilMoisture * 100)}% vol` : 'Seco',
    recentRain: `${recentRainSum.toFixed(1)} mm recientes`,
    advice: 'Suelo con excelente sustentación. Tránsito sin deformación de huella ni compactación.',
    simpleExp: 'El piso está firme y oreado. Las máquinas ruedan perfecto sin compactar ni patinar.'
  };
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
      advice: `Temperaturas bajo cero (${lowest}°C). Alto riesgo en hojas y espigas tiernas.`,
      simpleExp: `Bajo cero (${lowest}°C): peligro de helada fuerte que quema brotes y hojas verdes.`
    };
  } else if (lowest <= 3) {
    return {
      status: 'yellow',
      title: 'Riesgo de Helada Agronómica',
      advice: `Temperatura cerca del suelo (${lowest}°C). Posible escarcha en bajos de campo.`,
      simpleExp: `Cerca de 0°C a nivel del pasto (${lowest}°C): puede escarchar en las cañadas y bajos.`
    };
  } else {
    return {
      status: 'green',
      title: 'Sin Riesgo de Heladas',
      advice: 'Temperaturas por encima del umbral de daño por frío.',
      simpleExp: 'Temperatura templada: sin riesgo de escarcha ni frío extremo.'
    };
  }
};
