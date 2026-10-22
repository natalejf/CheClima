/**
 * CheClima — Módulo de Text-To-Speech (Voz y Accesibilidad)
 * Diseñado especialmente para personas no videntes y productores en lote.
 * Genera un reporte oral completo de la jornada y los próximos 7 días,
 * con soporte para Web Speech API, chunking de oraciones y controles de audio.
 */

import { getWindDirectionName, getWeatherDescription } from './weather';

/**
 * Genera el guion completo de voz en lenguaje natural y accesible.
 */
export function buildAudioReportText({
  city,
  current,
  daily,
  todayAnalysis,
  weeklyAnalysis,
  ensembleData,
  deltaT,
  soilTraffic,
  thermalInversion,
  frostRisk,
  nozzleRec,
  dewRisk,
  harvestDiag,
  rainfastDiag,
  sprayProfile,
  sprayMethod,
  SPRAY_PROFILES,
  SPRAY_METHODS,
  formattedDate
}) {
  if (!city || !current) {
    return ["No hay datos meteorológicos disponibles en este momento."];
  }

  const chunks = [];

  // 1. Bienvenida e Identificación de Ciudad y Fecha
  chunks.push(`Reporte meteorológico y agronómico de CheClima.`);
  chunks.push(`Localidad de ${city.name}${city.admin1 ? ', ' + city.admin1 : ''}.`);
  if (formattedDate) {
    chunks.push(`Pronóstico correspondiente al día de hoy, ${formattedDate}.`);
  }

  // 2. Estado Actual del Tiempo
  const temp = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature ?? current.temperature_2m);
  const weatherDesc = getWeatherDescription(current.weather_code);
  
  chunks.push(`Comenzamos con las condiciones actuales en la ciudad.`);
  chunks.push(`La temperatura actual es de ${temp} grados centígrados, con una sensación térmica de ${feelsLike} grados.`);
  chunks.push(`El estado del cielo es: ${weatherDesc}.`);

  if (todayAnalysis) {
    chunks.push(`Para hoy se espera una temperatura máxima de ${Math.round(todayAnalysis.maxTemp)} grados, y una mínima de ${Math.round(todayAnalysis.minTemp)} grados.`);
  }

  // 3. Viento, Ráfagas y Humedad (Factores Críticos Agro)
  const windDir = getWindDirectionName(current.wind_direction_10m);
  chunks.push(`En cuanto al viento, sopla desde el ${windDir} a una velocidad de ${current.wind_speed_10m} kilómetros por hora, con ráfagas de hasta ${current.wind_gusts_10m} kilómetros por hora.`);
  chunks.push(`La humedad relativa del aire es del ${current.relative_humidity_2m} por ciento.`);

  // 4. Delta T y Evaporación
  if (deltaT) {
    chunks.push(`El indicador Delta T de evaporación para pulverizaciones se ubica en ${deltaT.deltaT} grados, correspondiente a ${deltaT.zone}.`);
    if (deltaT.advice) {
      chunks.push(`${deltaT.advice}`);
    }
  }

  // 5. Precipitaciones de Hoy y Lluvias Recientes
  const precip = current.precipitation || 0;
  const recentRain = weeklyAnalysis?.recentRainSum || 0;
  if (precip > 0) {
    chunks.push(`Atención: se registran precipitaciones actuales de ${precip} milímetros.`);
  } else {
    chunks.push(`Al momento no se registran lluvias.`);
  }

  if (recentRain > 0) {
    chunks.push(`En los últimos tres días se acumuló un total de ${recentRain.toFixed(1)} milímetros de agua caída.`);
  }

  // 6. Estado del Lote y Labores para Hoy
  chunks.push(`Diagnóstico de labores y estado del lote para hoy:`);

  // Piso del lote
  if (soilTraffic) {
    chunks.push(`Piso en lote: ${soilTraffic.title}. ${soilTraffic.simpleExp || soilTraffic.advice}`);
  }

  // Ventana de fumigación y pulverización hoy
  const profileName = SPRAY_PROFILES?.[sprayProfile]?.name ? SPRAY_PROFILES[sprayProfile].name.split(' (')[0] : 'aplicación';
  const methodName = SPRAY_METHODS?.[sprayMethod]?.name ? SPRAY_METHODS[sprayMethod].name : 'terrestre';
  
  if (todayAnalysis?.windows && todayAnalysis.windows.length > 0) {
    chunks.push(`Para pulverización ${methodName} de ${profileName}, hoy existe ventana horaria apta entre las ${todayAnalysis.windows.join(' y las ')}.`);
  } else {
    chunks.push(`Para hoy no se detectan ventanas óptimas para pulverizar, debido a limitaciones de viento o evaporación.`);
  }

  // Recomendación de pastillas
  if (nozzleRec) {
    chunks.push(`Recomendación de pastillas: ${nozzleRec.nozzleType}. ${nozzleRec.whyExplain}`);
  }

  // Rocío y lavado
  if (dewRisk) {
    chunks.push(`Riesgo de rocío sobre follaje: ${dewRisk.simpleExp || dewRisk.level}.`);
  }
  if (rainfastDiag) {
    chunks.push(`Riesgo de lavado por lluvia en las próximas 6 horas: ${rainfastDiag.simpleExp || rainfastDiag.risk}.`);
  }

  // Cosecha hoy
  if (harvestDiag) {
    chunks.push(`En cuanto a cosecha y trilla comercial de granos: ${harvestDiag.verdict}. ${harvestDiag.simpleExp || harvestDiag.advice}`);
  }

  // Inversión y heladas
  if (thermalInversion && thermalInversion.status !== 'green') {
    chunks.push(`Alerta de inversión térmica: ${thermalInversion.title}. ${thermalInversion.advice}`);
  }
  if (frostRisk && frostRisk.status !== 'green') {
    chunks.push(`Alerta de heladas: ${frostRisk.title}. ${frostRisk.advice}`);
  }

  // 7. Perspectiva de los Próximos 7 Días (Lo Más Importante)
  chunks.push(`Pasamos a los aspectos clave para los próximos siete días.`);

  const totalWeeklyRain = weeklyAnalysis?.days ? weeklyAnalysis.days.reduce((acc, d) => acc + d.rainSum, 0).toFixed(1) : 0;
  const totalGreenHours = weeklyAnalysis?.days ? weeklyAnalysis.days.reduce((acc, d) => acc + d.greenCount, 0) : 0;
  const maxGust = weeklyAnalysis?.days?.length ? Math.max(...weeklyAnalysis.days.map(d => d.maxGust)) : 0;

  if (Number(totalWeeklyRain) > 0) {
    chunks.push(`Pronóstico de lluvia semanal: Se espera un acumulado total aproximado de ${totalWeeklyRain} milímetros a lo largo de los siete días.`);
    
    // Detallar los días con lluvia
    if (weeklyAnalysis?.days) {
      const rainyDays = weeklyAnalysis.days
        .filter(d => d.rainSum >= 1)
        .map(d => {
          const date = new Date(d.dateStr + 'T00:00:00');
          const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          return `${days[date.getDay()]} con ${d.rainSum} milímetros`;
        });
      if (rainyDays.length > 0) {
        chunks.push(`Los días con mayor probabilidad de precipitaciones son: ${rainyDays.join(', ')}.`);
      }
    }
  } else {
    chunks.push(`Buenas noticias para las labores: no se prevén lluvias significativas en los próximos siete días.`);
  }

  chunks.push(`Se proyectan ${totalGreenHours} horas aptas para aplicaciones a lo largo de la semana, con una ráfaga máxima esperada de ${maxGust} kilómetros por hora.`);

  // Mejor día de la semana
  if (weeklyAnalysis?.bestDayFumigar) {
    const bDay = weeklyAnalysis.bestDayFumigar;
    const date = new Date(bDay.dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const bName = days[date.getDay()];
    chunks.push(`El mejor día de la semana para pulverizar será el ${bName}, contando con ${bDay.greenCount} horas de condiciones óptimas.`);
  }

  if (weeklyAnalysis?.bestDayCosechar) {
    const cDay = weeklyAnalysis.bestDayCosechar;
    const date = new Date(cDay.dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const cName = days[date.getDay()];
    chunks.push(`Para trilla y cosecha, el día más favorable será el ${cName}, con follaje seco y condiciones estables.`);
  }

  // Mejor ventana semanal continua
  if (weeklyAnalysis?.bestWindowAcrossWeek) {
    const bw = weeklyAnalysis.bestWindowAcrossWeek;
    chunks.push(`La ventana operativa destacada de la semana es el ${bw.dayName}, de ${bw.timeRange}, con un índice de aptitud de ${bw.avgScore} sobre 100 puntos.`);
  }

  // Consenso Multi-Modelo
  if (ensembleData?.days?.length) {
    const avgScore = Math.round(ensembleData.days.reduce((acc, d) => acc + d.reliabilityScore, 0) / ensembleData.days.length);
    chunks.push(`El consenso entre los modelos meteorológicos de Europa, Estados Unidos y Alemania presenta una fiabilidad del ${avgScore} por ciento para el período.`);
  }

  // 8. Cierre
  chunks.push(`Este ha sido el reporte completo de CheClima. Le deseamos una excelente y segura jornada de trabajo.`);

  return chunks;
}

/**
 * Controlador de Reproducción de Voz utilizando Web Speech API.
 * Gestiona cola de oraciones, eventos, pausa, reanudación y cancelación.
 */
export class CheClimaSpeechController {
  constructor(onStateChange) {
    this.onStateChange = onStateChange || (() => {});
    this.chunks = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.spanishVoice = null;
    this.keepAliveTimer = null;

    if (this.synth) {
      this.initVoices();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Prioridad: español de Argentina (es-AR), luego Latinoamérica (es-419, es-MX), luego España (es-ES), o cualquier 'es'
    const arVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === 'es-ar');
    const latamVoice = voices.find(v => v.lang.toLowerCase().includes('es-419') || v.lang.toLowerCase().includes('es-mx') || v.lang.toLowerCase().includes('es-us'));
    const esVoice = voices.find(v => v.lang.toLowerCase().startsWith('es'));

    this.spanishVoice = arVoice || latamVoice || esVoice || voices[0];
  }

  isSupported() {
    return Boolean(this.synth && typeof SpeechSynthesisUtterance !== 'undefined');
  }

  start(chunks) {
    if (!this.isSupported()) {
      alert('La síntesis de voz no está soportada en este navegador.');
      return;
    }

    this.stop();
    this.chunks = Array.isArray(chunks) ? chunks.filter(c => c && c.trim()) : [];
    if (this.chunks.length === 0) return;

    this.currentIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.initVoices();

    this.notify();
    this.speakCurrent();
  }

  speakCurrent() {
    if (!this.isPlaying || this.isPaused || this.currentIndex >= this.chunks.length) {
      if (this.currentIndex >= this.chunks.length) {
        this.stop();
      }
      return;
    }

    const text = this.chunks[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(text);

    if (this.spanishVoice) {
      utterance.voice = this.spanishVoice;
      utterance.lang = this.spanishVoice.lang;
    } else {
      utterance.lang = 'es-AR';
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (!this.isPlaying) return;
      this.currentIndex++;
      this.notify();
      this.speakCurrent();
    };

    utterance.onerror = (e) => {
      // Ignorar errores generados por cancelación manual
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('CheClima TTS utterance error:', e);
      this.currentIndex++;
      if (this.currentIndex < this.chunks.length) {
        this.speakCurrent();
      } else {
        this.stop();
      }
    };

    // Keep-alive para evitar congelamientos en Chrome en oraciones largas
    this.clearKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.isPlaying && !this.isPaused && this.synth?.speaking) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);

    this.synth.speak(utterance);
    this.notify();
  }

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.notify();
    }
  }

  resume() {
    if (this.synth && this.isPlaying && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.notify();
    }
  }

  stop() {
    this.clearKeepAlive();
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.notify();
  }

  clearKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  notify() {
    this.onStateChange({
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalChunks: this.chunks.length,
      currentText: this.chunks[this.currentIndex] || '',
      progress: this.chunks.length > 0 ? Math.round(((this.currentIndex) / this.chunks.length) * 100) : 0
    });
  }
}
