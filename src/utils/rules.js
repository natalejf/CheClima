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
  let advice = 'Buena ventana: el caldo sale de la pastilla y llega a la hoja sin perder volumen.';
  let simpleExp = 'Todo en orden: el producto llega a la planta sin evaporarse en el camino.';

  if (deltaT < 2) {
    status = 'yellow';
    zone = 'Bajo (< 2°C)';
    advice = 'Aire muy húmedo o frío. Las gotas flotan en suspensión y hay riesgo de que el viento las lleve lejos del lote.';
    simpleExp = 'Demasiado húmedo: las gotas no caen, quedan en el aire y pueden derivar a campos vecinos.';
  } else if (deltaT >= 2 && deltaT <= 8) {
    status = 'green';
    zone = 'Óptimo (2°C - 8°C)';
    advice = 'Ventana ideal. La gota no se evapora ni flota: llega entera a donde la mandás.';
    simpleExp = 'Condición perfecta para pulverizar.';
  } else if (deltaT > 8 && deltaT <= 10) {
    status = 'yellow';
    zone = 'Precaución (8°C - 10°C)';
    advice = 'Calor seco: subí el tamaño de gota y agregá aceite al caldo para que el remedio no se evapore en el aire.';
    simpleExp = 'Hace calor y el aire está seco. Las gotas chicas se evaporan antes de tocar la hoja — usá gotas más gruesas y aceite.';
  } else {
    status = 'red';
    zone = 'Crítico (> 10°C)';
    advice = 'No salgas al lote ahora. El calor evapora la gota antes de que toque la maleza.';
    simpleExp = 'Demasiado calor y seco: estás tirando producto al aire. Esperá a que baje la temperatura.';
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
        message: `Está lloviendo ahora mismo (${rain} mm). Todo lo que apliques se va a lavar.`,
        action: 'Pará la máquina y esperá que el cultivo esté completamente seco antes de volver.'
      };
    }

    // Heavy recent rain making ground untrafficable or plants waterlogged
    if (recentRainSum > 35) {
      return {
        status: 'red',
        message: `Cayeron ${recentRainSum.toFixed(1)} mm en los últimos 3 días — el lote está muy blando para entrar con maquinaria.`,
        action: 'Dejá que oree el suelo. No vale la pena arriesgar encajar la pulverizadora.'
      };
    }

    // Wind extremes
    if (wind > SPRAY_THRESHOLDS.criticalWind || gusts > 28) {
      return { 
        status: 'red', 
        message: `Viento demasiado fuerte: ${wind} km/h con ráfagas de ${gusts} km/h. El producto se va a los campos vecinos.`,
        action: 'Pará la aplicación. Con este viento estás fumigando para el vecino.'
      };
    }

    // Heat extremes
    if (temp > SPRAY_THRESHOLDS.maxTemp) {
      return { 
        status: 'red', 
        message: `Hace demasiado calor: ${temp}°C. El caldo se evapora en el aire antes de tocar la hoja.`,
        action: 'Dejalo para el anochecer o la primera hora de la mañana, cuando baje a menos de 25°C.'
      };
    }

    // High Delta T
    if (deltaT > 10) {
      return { 
        status: 'red', 
        message: `Delta T muy alto (${deltaT}°C): el calor seco evapora el caldo antes de llegar a la planta.`,
        action: 'Esperá que suba la humedad o baje la temperatura. Ahora estás tirando producto al pedo.'
      };
    }

    // Calms and thermal inversion
    if (wind < SPRAY_THRESHOLDS.minWind) {
      return { 
        status: 'yellow', 
        message: `Viento casi parado: ${wind} km/h. Ojo con la inversión térmica — las gotas flotan y no caen al lote.`,
        action: 'Mirá el humo o el polvo de las ruedas: si queda flotando, no salgas. Esperá que levante el viento.'
      };
    }

    // Recent rain warning (between 15 and 35 mm)
    if (recentRainSum > 15) {
      return {
        status: 'yellow',
        message: `Cayeron ${recentRainSum.toFixed(1)} mm estos días — el piso en cabeceras y bajos puede estar húmedo.`,
        action: 'Entrá con precaución: rodado ancho o menos carga de tanque para no compactar ni quedar enterrado.'
      };
    }

    // Limit wind
    if (wind > SPRAY_THRESHOLDS.idealMaxWind) {
      return { 
        status: 'yellow', 
        message: `El viento está al límite: ${wind} km/h con ráfagas de ${gusts} km/h. Hay riesgo de que el producto se vaya.`,
        action: 'Poné pastillas antideriva con aire inducido (AI) y bajá el botalón lo más que puedas.'
      };
    }

    // Dry air
    if (hum < SPRAY_THRESHOLDS.minHum || deltaT > 8) {
      return { 
        status: 'yellow', 
        message: `El aire está seco (HR ${hum}%, ΔT ${deltaT}°C) — las gotas chicas se evaporan antes de llegar a la hoja.`,
        action: 'Agregá aceite antievaporante al caldo y usá gotas más gruesas para que lleguen enteras.'
      };
    }

    return { 
      status: 'green', 
      message: `Todo en orden para salir al campo. Viento, temperatura y humedad están dentro del rango ideal.`,
      action: 'Arrancá tranquilo con presión normal. Ventana abierta para trabajar bien.'
    };
  }

  if (task === 'cosechar') {
    if (rain > 0) {
      return { 
        status: 'red', 
        message: `Está lloviendo (${rain} mm). El grano y la planta están mojados — la cosechadora tiene que quedarse parada.`,
        action: 'Esperá el secado natural del cultivo. No hay apuro que valga la pena con este tiempo.'
      };
    }

    if (recentRainSum > 20) {
      return {
        status: 'red',
        message: `Cayeron ${recentRainSum.toFixed(1)} mm estos días. El suelo está blando y el rastrojo mojado — riesgo de enterrar la máquina.`,
        action: 'Dejá que seque bien el piso y la planta. Antes de entrar, chequeá la humedad del grano con el calador.'
      };
    }

    if (recentRainSum > 8) {
      return {
        status: 'yellow',
        message: `Llovieron ${recentRainSum.toFixed(1)} mm hace poco. El grano puede tener humedad superficial todavía.`,
        action: 'Medí la humedad en tolva con el humidímetro antes de llenar el camión. Empezá por los lotes más altos.'
      };
    }

    if (hum > 75) {
      return { 
        status: 'red', 
        message: `Humedad del aire muy alta: ${hum}%. El grano va a llegar al acopio con más agua de lo permitido.`,
        action: 'Esperá a que el sol trabaje un par de horas más. La trilla arranca bien recién pasadas las 11:30 hs.'
      };
    }

    if (hum > 65) {
      return { 
        status: 'yellow', 
        message: `Humedad del aire en el límite: ${hum}%. Vale la pena medir el grano antes de comprometer mucho camión.`,
        action: 'Empezá por los lotes más urgentes y chequeá seguido la humedad. A media tarde suele bajar.'
      };
    }

    return { 
      status: 'green', 
      message: `Buenas condiciones para trillar: ${hum}% de humedad y ${Math.round(temp)}°C. El grano va a salir seco y limpio.`,
      action: 'Aprovechá las horas del mediodía para avanzar. Jornada ideal para entrega directa sin costo de secado.'
    };
  }

  return { status: 'yellow', message: 'Sin datos para esta labor.', action: '', seasonNote: '' };
};

/**
 * Evaluates Daily Harvest conditions.
 */
export const evaluateDailyHarvest = (rainSum, maxHum, minHum, recentRain = 0) => {
  if (rainSum > 1) {
    return { status: 'red', label: 'No Apto', reason: `Se esperan ${rainSum} mm de lluvia — la trilla se corta.` };
  }
  if (recentRain > 25) {
    return { status: 'red', label: 'Piso Pesado', reason: `Suelo blando por las lluvias recientes (${recentRain.toFixed(1)} mm). Riesgo de enterrar la cosechadora.` };
  }
  if (rainSum > 0) {
    return { status: 'yellow', label: 'Incierto', reason: `Llovizna débil posible (${rainSum} mm). El arranque se puede retrasar.` };
  }
  if (minHum !== undefined && minHum > 70) {
    return { status: 'red', label: 'No Apto', reason: `Día muy húmedo (mín ${minHum}%). El grano no baja la humedad.` };
  }
  if (maxHum > 80 && minHum > 60) {
    return { status: 'yellow', label: 'Precaución', reason: `Día con bastante humedad (mín ${minHum}%). La ventana de trilla va a ser corta.` };
  }
  return { status: 'green', label: 'Apto', reason: 'Buen día para trillar — el ambiente acompaña.' };
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
      level: 'Rocío activo — follaje mojado',
      diff,
      advice: 'Las hojas están mojadas. Si pulverizás ahora, el caldo chorrea al suelo y perdés todo el producto. Si trillás, el grano sale pasado de agua.',
      simpleExp: 'Las hojas están con rocío. Ni pulverices ni trilles — esperá que seque bien.'
    };
  }
  if (diff <= 3.0 || hum > 80) {
    return {
      status: 'yellow',
      level: 'Rocío por venir — andá cerrando',
      diff,
      advice: 'La humedad está subiendo y se viene el rocío. Si estás trillando, andá redondeando. Si pensabas salir a aplicar, mejor mañana temprano.',
      simpleExp: 'Se viene el rocío de la tardecita. Andá terminando lo que tenés en el lote.'
    };
  }
  return {
    status: 'green',
    level: 'Follaje seco',
    diff,
    advice: 'Hojas y espigas completamente secas. Ideal tanto para que el producto se pegue bien como para que la cosechadora trille limpia.',
    simpleExp: '100% seco. Todo lo que apliques se queda en la planta, y la trilladora trabaja sin atorarse.'
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
      verdict: 'Lluvia activa — pará todo',
      advice: 'Está cayendo lluvia. Imposible trillar.',
      simpleExp: 'Lluvia cayendo: guardá la cosechadora hasta que escampe y seque la planta.'
    };
  }
  if (recentRain > 25) {
    return {
      status: 'red',
      verdict: 'Suelo blando — no entres',
      advice: `Llovieron ${recentRain.toFixed(1)} mm estos días. El suelo está demasiado blando para la cosechadora y las tolvas.`,
      simpleExp: `Con ${recentRain.toFixed(1)} mm caídos, el suelo está flojo. Vas a dejar huellas feas o quedar enterrado.`
    };
  }
  if (h > 75) {
    return {
      status: 'red',
      verdict: 'Grano fuera de norma — esperá',
      advice: `El aire tiene ${h}% de humedad. El grano va a llegar al acopio pasado y te van a cobrar secada o rechazar el camión.`,
      simpleExp: `Con ${h}% de humedad en el aire, el grano absorbe agua. No vale la pena arriesgar descuentos en el acopio.`
    };
  }
  if (h > 65) {
    return {
      status: 'yellow',
      verdict: 'Al límite — medí antes de cargar',
      advice: `Humedad del aire en ${h}%. Medí la humedad del grano en tolva con el tester antes de completar el camión.`,
      simpleExp: 'Está al borde. Tomá una muestra de la tolva con el humidímetro antes de comprometer carga.'
    };
  }
  if (t < 14) {
    return {
      status: 'yellow',
      verdict: 'Día fresco — arrancá más tarde',
      advice: `Con ${t}°C, el rocío de la mañana tarda más en secarse. Mejor esperá un poco antes de arrancar.`,
      simpleExp: 'Fresco: el rocío de la madrugada tarda en irse. Arrancá cuando el sol ya esté alto.'
    };
  }
  return {
    status: 'green',
    verdict: 'Ideal para trillar',
    advice: `${h}% de humedad y ${t}°C. El grano sale seco y con mínima rotura. Condición perfecta para entrega directa.`,
    simpleExp: 'Condición ideal: el grano está en su punto justo para ir directo al camión sin pagar secado.'
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
      risk: 'Va a llover — no salgas',
      advice: `Se esperan ${rainNext6h.toFixed(1)} mm en las próximas 6 horas. La lluvia lava el 80–100% del activo que aplicaste.`,
      simpleExp: 'Va a llover pronto. Si salís ahora, tirás el producto y el dinero a la cañada.'
    };
  }
  if (rainNext6h > 0.5) {
    return {
      status: 'yellow',
      hoursToRain: '< 6 horas',
      risk: 'Llovizna posible — tomá recaudos',
      advice: `Hay ${rainNext6h.toFixed(1)} mm previstos. Si salís igual, usá un adherente siliconado para que la hoja absorba rápido antes de que llegue la humedad.`,
      simpleExp: 'Puede caer una llovizna. Si no podés esperar, agregá adherente al caldo para que el producto se fije rápido.'
    };
  }
  return {
    status: 'green',
    hoursToRain: '> 6 horas',
    risk: 'Cielo despejado — tranquilo',
    advice: 'Más de 6 horas sin lluvia prevista. El producto tiene tiempo de sobra para absorberse y fijarse en la cutícula.',
    simpleExp: 'Sin lluvia por al menos 6 horas. Aplicá tranquilo — el producto se va a absorber bien.'
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
      title: 'Calma chicha — no apliques',
      advice: 'Sin viento, las gotas no caen: quedan flotando como niebla y el primer soplito las lleva a kilómetros del lote.',
      simpleExp: 'Calma total. Las gotas flotan, no caen. Podés derivar al vecino sin querer.'
    };
  } else if (windSpeed >= 3 && windSpeed <= 6) {
    return {
      status: 'yellow',
      title: 'Viento suave — mirá bien antes',
      advice: 'Poco viento. Si es de mañanita o al atardecer, fijate en el polvo de las ruedas o el humo: si se queda flotando horizontal, no es el momento.',
      simpleExp: 'Poco viento. Mirá el polvo o el humo — si flota sin disiparse, hay inversión y es mejor esperar.'
    };
  } else {
    return {
      status: 'green',
      title: 'Buen movimiento de aire',
      advice: 'El viento mezcla bien el aire. Las gotas caen donde las mandás y no hay inversión que te juegue una mala pasada.',
      simpleExp: 'Aire en movimiento. No hay inversión — las gotas caen al lote.'
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
      title: 'Barro pesado — no entres',
      moistureVal: soilMoisture ? `${Math.round(soilMoisture * 100)}% vol` : `${recentRainSum.toFixed(1)} mm caídos`,
      recentRain: `${recentRainSum.toFixed(1)} mm recientes`,
      advice: 'El suelo está saturado. Si entrás con la autopropulsada o el tractor, te vas a enterrar y dejás el lote con huellas que duelen.',
      simpleExp: 'Barro de verdad. No metas maquinaria pesada — el riesgo de encajar no vale la pena.'
    };
  }

  if (recentRainSum > 12 || precip > 2 || (soilMoisture !== undefined && soilMoisture > 0.33)) {
    return {
      status: 'yellow',
      title: 'Piso húmedo — andá con cuidado',
      moistureVal: soilMoisture ? `${Math.round(soilMoisture * 100)}% vol` : `${recentRainSum.toFixed(1)} mm caídos`,
      recentRain: `${recentRainSum.toFixed(1)} mm recientes`,
      advice: 'Se puede entrar, pero ojo con las cabeceras y los bajos. Usá neumáticos de baja presión o flotación para no compactar.',
      simpleExp: 'El suelo todavía tiene humedad. Entrá despacio y evitá los sectores bajos del potrero.'
    };
  }

  return {
    status: 'green',
    title: 'Piso firme — tranquilo para entrar',
    moistureVal: soilMoisture ? `${Math.round(soilMoisture * 100)}% vol` : 'Seco',
    recentRain: `${recentRainSum.toFixed(1)} mm recientes`,
    advice: 'El suelo está bien seco y firme. Las máquinas entran sin problema y sin dejar huellas.',
    simpleExp: 'Piso de primera. Rodás sin patinar, sin hundirte y sin compactar el suelo.'
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
      title: 'Helada fuerte — cuidado con los lotes',
      advice: `Temperatura bajo cero (${lowest}°C). Las hojas verdes, espigas y brotes tiernos pueden quemarse.`,
      simpleExp: `Bajo cero (${lowest}°C). Una helada así quema lo que encuentre verde — revisá el lote a la mañana.`
    };
  } else if (lowest <= 3) {
    return {
      status: 'yellow',
      title: 'Helada agronómica posible',
      advice: `Con ${lowest}°C a nivel del suelo puede escarchar en los bajos y cañadas. Ojo si tenés cultivos en estado sensible.`,
      simpleExp: `Frío cerca de cero (${lowest}°C): puede escarchar en los sectores bajos del campo esta noche.`
    };
  } else {
    return {
      status: 'green',
      title: 'Sin heladas',
      advice: 'Temperatura bien por encima del peligro de frío. No hay riesgo de daño por bajas temperaturas.',
      simpleExp: 'Sin riesgo. Temperatura tranquila, lejos del límite de escarcha.'
    };
  }
};
