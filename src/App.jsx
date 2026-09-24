import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, Droplets, MapPin, Navigation, Thermometer, 
  CloudRain, Calendar, Clock, Search, X, Sprout, ShieldAlert,
  Gauge, AlertTriangle, Truck, Snowflake, Sunrise, Sunset,
  Sun, Moon, Award, CheckCircle2, XCircle, AlertCircle, Play, Square
} from 'lucide-react';
import { 
  fetchWeather, searchCities, POPULAR_CITIES, 
  getWindDirectionName, getWeatherDescription,
  formatTimeHHMM, calculateDaylightDuration
} from './utils/weather';
import { 
  evaluateConditions, calculateDeltaT, 
  evaluateThermalInversion, evaluateSoilTrafficability, 
  evaluateFrostRisk, analyzeWeeklySprayingWindows
} from './utils/rules';

function App() {
  const [selectedCity, setSelectedCity] = useState(POPULAR_CITIES[0]); // Default Pergamino
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const searchContainerRef = useRef(null);

  // Fetch weather when selected city changes
  useEffect(() => {
    let isMounted = true;
    const loadWeather = async () => {
      setLoading(true);
      const data = await fetchWeather(selectedCity.lat, selectedCity.lon);
      if (isMounted) {
        setWeatherData(data);
        setLoading(false);
      }
    };
    loadWeather();
    return () => { isMounted = false; };
  }, [selectedCity]);

  // Debounced search for cities
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchCities(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const current = weatherData?.current;
  const hourly = weatherData?.hourly;
  const daily = weatherData?.daily;

  // Perform weekly and daily operational analysis
  const weeklyAnalysis = weatherData ? analyzeWeeklySprayingWindows(weatherData) : null;
  const todayAnalysis = weeklyAnalysis?.today;
  const bestDay = weeklyAnalysis?.bestDayOfWeek;

  // Compute immediate spray status
  const currentSprayEval = current ? evaluateConditions('pulverizar', current) : null;

  // Format dates for daily forecast
  const getDayName = (dateStr, index) => {
    if (index === 0) return 'Hoy';
    if (index === 1) return 'Mañana';
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const formatDateShort = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Compute operational insights
  const deltaT = current ? calculateDeltaT(current.temperature_2m, current.relative_humidity_2m) : null;
  const thermalInversion = current ? evaluateThermalInversion(current.wind_speed_10m) : null;
  const soilTraffic = current ? evaluateSoilTrafficability(current.precipitation, current.relative_humidity_2m) : null;
  const frostRisk = current ? evaluateFrostRisk(current.temperature_2m, daily?.temperature_2m_min[0]) : null;

  return (
    <div className="app-container">
      {/* Header & City Search Bar */}
      <header className="app-header glass-panel mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="brand flex items-center gap-3 w-full md:w-auto">
            <div className="brand-icon shrink-0">
              <Sprout size={32} color="#3fb950" />
            </div>
            <div>
              <h1 className="brand-title flex items-center gap-2 text-xl md:text-2xl">
                Fumiga-arg <span className="badge-beta">AGRO</span>
              </h1>
              <p className="text-xs text-muted">Monitor de decisiones y ventanas de pulverización</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="search-wrapper w-full md:w-auto" ref={searchContainerRef}>
            <div className="search-input-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar cualquier ciudad o localidad..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {searchQuery && (
                <button 
                  className="clear-btn" 
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (searchResults.length > 0 || isSearching) && (
              <div className="search-dropdown glass-panel">
                {isSearching ? (
                  <div className="p-3 text-center text-sm text-muted">Buscando localidades...</div>
                ) : (
                  searchResults.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="search-item"
                      onClick={() => handleSelectCity(item)}
                    >
                      <MapPin size={16} className="text-muted shrink-0" />
                      <div>
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-xs text-muted ml-2">
                          {[item.admin1, item.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected City Info & Quick Cities */}
        <div className="mt-4 pt-4 border-t border-glass flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <MapPin size={20} color="var(--primary-hover)" className="shrink-0" />
            <span className="text-lg">{selectedCity.name}</span>
            <span className="text-sm text-muted font-normal">
              {[selectedCity.admin1, selectedCity.country].filter(Boolean).join(', ')}
            </span>
          </div>

          {/* Popular City Quick Buttons */}
          <div className="popular-cities flex flex-wrap items-center gap-1-5 w-full sm:w-auto">
            <span className="text-xs text-muted font-medium mr-1">Populares:</span>
            {POPULAR_CITIES.map((c, i) => (
              <button
                key={i}
                className={`chip-btn ${selectedCity.name === c.name ? 'active' : ''}`}
                onClick={() => handleSelectCity(c)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 glass-panel">
          <div className="loader mb-3"></div>
          <p className="text-muted text-sm">Analizando clima y calculando ventanas de trabajo para {selectedCity.name}...</p>
        </div>
      ) : current ? (
        <>
          {/* HERO PANEL: PANORAMA GENERAL Y VENTANA DE TRABAJO DE HOY */}
          <div className="glass-panel hero-panorama-card mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-glass pb-4 mb-4">
              <div>
                <span className="text-xs text-muted font-bold uppercase tracking-wider">Panorama de Pulverización</span>
                <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                  {selectedCity.name}: ¿Conviene fumigar hoy?
                </h2>
              </div>

              {/* Status Alert Badge */}
              <div className={`spray-now-badge badge-hero-${currentSprayEval?.status}`}>
                {currentSprayEval?.status === 'green' && <CheckCircle2 size={24} className="shrink-0" />}
                {currentSprayEval?.status === 'yellow' && <AlertCircle size={24} className="shrink-0" />}
                {currentSprayEval?.status === 'red' && <XCircle size={24} className="shrink-0" />}
                <div>
                  <div className="text-xs font-bold uppercase">Estado Actual</div>
                  <div className="text-sm md:text-base font-extrabold">
                    {currentSprayEval?.status === 'green' ? '🟢 SE PUEDE FUMIGAR AHORA' : currentSprayEval?.status === 'yellow' ? '🟡 PRECAUCIÓN AL APLICAR' : '🔴 NO FUMIGAR AHORA'}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs md:text-sm text-muted mb-4 leading-relaxed">
              <strong>Diagnóstico actual:</strong> {currentSprayEval?.message}
            </p>

            {/* Work Window & Sun Schedule Grid */}
            <div className="panorama-details-grid">
              {/* Cuándo Arrancar */}
              <div className="panorama-box green-highlight">
                <div className="flex items-center gap-2 mb-1 text-primary font-bold text-xs uppercase">
                  <Play size={16} /> Cuándo Arrancar Hoy
                </div>
                <div className="text-lg font-black text-white">
                  {todayAnalysis?.bestStart}
                </div>
                <span className="text-xs text-muted mt-1">Hora de inicio recomendada</span>
              </div>

              {/* Cuándo Parar */}
              <div className="panorama-box red-highlight">
                <div className="flex items-center gap-2 mb-1 text-red-400 font-bold text-xs uppercase">
                  <Square size={16} /> Cuándo Parar Hoy
                </div>
                <div className="text-lg font-black text-white">
                  {todayAnalysis?.bestStop}
                </div>
                <span className="text-xs text-muted mt-1">Límite por viento/evaporación</span>
              </div>

              {/* Horarios de Luz y Noche */}
              <div className="panorama-box">
                <div className="flex items-center gap-2 mb-1 text-yellow-400 font-bold text-xs uppercase">
                  <Sun size={16} /> Luz Solar y Noche
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-white">
                    <Sunrise size={14} className="text-yellow-400 shrink-0" />
                    <span>Salida: <strong>{formatTimeHHMM(todayAnalysis?.sunrise)} hs</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white">
                    <Sunset size={14} className="text-orange-400 shrink-0" />
                    <span>Puesta: <strong>{formatTimeHHMM(todayAnalysis?.sunset)} hs</strong></span>
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Luz total: <strong>{calculateDaylightDuration(todayAnalysis?.sunrise, todayAnalysis?.sunset)}</strong>
                </div>
              </div>
            </div>

            {/* Best Day of Week Golden Banner */}
            {bestDay && (
              <div className="best-day-banner mt-4">
                <Award size={24} className="text-yellow-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase text-yellow-400 tracking-wider">🏆 MEJOR DÍA DE LA SEMANA PARA FUMIGAR</div>
                  <div className="text-sm md:text-base font-bold text-white">
                    {getDayName(bestDay.dateStr, bestDay.dayIndex)} ({formatDateShort(bestDay.dateStr)}) — {bestDay.greenCount} horas de ventana óptima
                  </div>
                  <div className="text-xs text-muted">
                    Ventana recomendada: {bestDay.windows.join(' y ')}. Viento máx: {bestDay.maxWind} km/h.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN GRID: CURRENT WEATHER METRICS & AG-TASK SEMAPHORE */}
          <div className="main-grid mb-6">
            {/* Current Weather Card */}
            <div className="glass-panel weather-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <Thermometer size={20} color="var(--primary-hover)" /> Clima Actual en {selectedCity.name}
                </h2>
                <span className="weather-badge">
                  {getWeatherDescription(current.weather_code)}
                </span>
              </div>

              <div className="weather-main-grid">
                <div className="temp-display">
                  <span className="temp-huge">{Math.round(current.temperature_2m)}°</span>
                  <span className="temp-unit">C</span>
                </div>

                <div className="weather-metrics">
                  {/* Wind Metric */}
                  <div className="metric-box highlighted">
                    <div className="flex items-center gap-2 mb-1">
                      <Wind size={18} className="text-primary" />
                      <span className="text-xs text-muted font-bold uppercase tracking-wider">Viento</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {current.wind_speed_10m} <span className="text-sm font-normal text-muted">km/h</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Ráfagas: <strong className="text-white">{current.wind_gusts_10m} km/h</strong>
                    </div>
                    <div className="wind-direction-pill mt-2 flex items-center gap-1-5">
                      <Navigation 
                        size={14} 
                        style={{ transform: `rotate(${current.wind_direction_10m}deg)` }} 
                        className="shrink-0"
                      />
                      <span>Viento del <strong>{getWindDirectionName(current.wind_direction_10m)}</strong></span>
                      <span className="text-xs text-muted">({current.wind_direction_10m}°)</span>
                    </div>
                  </div>

                  {/* Humidity Metric */}
                  <div className="metric-box">
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets size={18} className="text-blue" />
                      <span className="text-xs text-muted font-bold uppercase tracking-wider">Humedad</span>
                    </div>
                    <div className="text-xl font-bold text-white">{current.relative_humidity_2m}%</div>
                    <span className="text-xs text-muted mt-1">Humedad relativa</span>
                  </div>

                  {/* Precipitation Metric */}
                  <div className="metric-box">
                    <div className="flex items-center gap-2 mb-1">
                      <CloudRain size={18} className="text-blue" />
                      <span className="text-xs text-muted font-bold uppercase tracking-wider">Lluvia</span>
                    </div>
                    <div className="text-xl font-bold text-white">{current.precipitation} <span className="text-sm font-normal text-muted">mm</span></div>
                    <span className="text-xs text-muted mt-1">Precipitación actual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General Agricultural Task Semaphore (No Crop Division) */}
            <div className="glass-panel tasks-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <ShieldAlert size={20} color="var(--primary-hover)" /> Semáforo de Labores
                </h2>
                <span className="text-xs text-muted">Evaluación agronómica</span>
              </div>

              <div className="tasks-grid">
                {['pulverizar', 'sembrar', 'cosechar'].map((task) => {
                  const rules = evaluateConditions(task, current);
                  return (
                    <div key={task} className={`state-card state-border-${rules.status}`}>
                      <div className="state-header">
                        <span className="font-bold capitalize text-white flex items-center gap-2">
                          {task === 'pulverizar' && <Wind size={16} />}
                          {task === 'sembrar' && <Sprout size={16} />}
                          {task === 'cosechar' && <Calendar size={16} />}
                          {task}
                        </span>
                        <span className={`status-badge badge-${rules.status}`}>
                          {rules.status === 'green' ? 'ÓPTIMO' : rules.status === 'yellow' ? 'PRECAUCIÓN' : 'NO RECOMENDADO'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-2 leading-relaxed">{rules.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PLANIFICADOR SEMANAL DE VENTANAS Y HORARIOS (7 DÍAS) */}
          <div className="glass-panel mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg">
                <Calendar size={20} color="var(--primary-hover)" /> Planificador Semanal de Pulverización (7 Días)
              </h2>
              <span className="text-xs text-muted">Ventanas de inicio, corte y luz solar</span>
            </div>

            <div className="weekly-schedule-list">
              {weeklyAnalysis?.days?.map((dayInfo, idx) => {
                const dayName = getDayName(dayInfo.dateStr, idx);
                const dateFormatted = formatDateShort(dayInfo.dateStr);

                return (
                  <div key={idx} className={`weekly-day-card day-status-${dayInfo.overallStatus} ${idx === 0 ? 'today-highlight' : ''}`}>
                    <div className="weekly-day-header">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm md:text-base">{dayName}</span>
                        <span className="text-xs text-muted">{dateFormatted}</span>
                        {idx === 0 && <span className="today-chip">HOY</span>}
                      </div>

                      <span className={`status-badge badge-${dayInfo.overallStatus}`}>
                        {dayInfo.overallStatus === 'green' ? `${dayInfo.greenCount}hs ÓPTIMAS` : dayInfo.overallStatus === 'yellow' ? 'VENTANA LIMITADA' : 'NO FUMIGAR'}
                      </span>
                    </div>

                    <div className="weekly-day-body mt-2">
                      <div className="weekly-windows-info">
                        <div className="text-xs text-white font-semibold flex items-center gap-1.5">
                          <Clock size={14} className="text-primary shrink-0" />
                          <span>Ventana recomendada: <strong>{dayInfo.windows.join(' | ')}</strong></span>
                        </div>
                        <div className="text-xs text-muted mt-1 flex items-center gap-1.5">
                          <Square size={12} className="text-red-400 shrink-0" />
                          <span>Cuándo parar: <strong>{dayInfo.bestStop}</strong></span>
                        </div>
                      </div>

                      <div className="weekly-day-sun flex items-center gap-3 mt-2 pt-2 border-t border-glass text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Sunrise size={12} className="text-yellow-400" /> Salida: {formatTimeHHMM(dayInfo.sunrise)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sunset size={12} className="text-orange-400" /> Puesta: {formatTimeHHMM(dayInfo.sunset)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Wind size={12} /> Viento máx: {dayInfo.maxWind} km/h
                        </span>
                        {dayInfo.rainSum > 0 && (
                          <span className="flex items-center gap-1 text-blue">
                            <CloudRain size={12} /> Lluvia: {dayInfo.rainSum} mm
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETALLE HORA POR HORA (48 HORAS CON ALERTAS) */}
          <div className="glass-panel mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg">
                <Clock size={20} color="var(--primary-hover)" /> Pronóstico Detallado Hora por Hora con Alerta (48 Horas)
              </h2>
              <span className="text-xs text-muted">Desliza para ver más horas →</span>
            </div>

            <div className="hourly-scroll">
              {hourly?.time?.slice(0, 48).map((timeStr, idx) => {
                const date = new Date(timeStr);
                const isNow = Math.abs(date.getTime() - Date.now()) < 1800000;
                const hours = date.getHours().toString().padStart(2, '0');
                const dayStr = date.toLocaleDateString('es-AR', { weekday: 'short' });
                const dirName = getWindDirectionName(hourly.wind_direction_10m[idx]);
                const temp = hourly.temperature_2m[idx];
                const hum = hourly.relative_humidity_2m[idx];
                const wind = hourly.wind_speed_10m[idx];
                const gusts = hourly.wind_gusts_10m[idx];
                const rain = hourly.precipitation[idx];

                // Calculate spray alert per hour
                const hourEval = evaluateConditions('pulverizar', {
                  temperature_2m: temp,
                  relative_humidity_2m: hum,
                  wind_speed_10m: wind,
                  wind_gusts_10m: gusts,
                  precipitation: rain
                });

                return (
                  <div key={idx} className={`hourly-item-extended ${isNow ? 'is-now' : ''} hourly-status-${hourEval.status}`}>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-muted uppercase font-semibold">{dayStr}</span>
                      <span className={`status-dot status-${hourEval.status}`}></span>
                    </div>

                    <span className="text-sm font-bold text-white mt-1">{hours}:00</span>
                    
                    <span className="hourly-temp font-extrabold text-white my-1">
                      {Math.round(temp)}°
                    </span>

                    {/* Spray Alert Label */}
                    <span className={`hourly-alert-chip alert-chip-${hourEval.status}`}>
                      {hourEval.status === 'green' ? 'FUMIGAR' : hourEval.status === 'yellow' ? 'PRECAUCIÓN' : 'PARAR'}
                    </span>

                    <div className="hourly-stat mt-2">
                      <Wind size={12} className="text-muted shrink-0" />
                      <span className="font-medium text-xs text-white">{wind} km/h</span>
                      <span className="text-[10px] text-muted">Ráf: {gusts}</span>
                    </div>

                    <div className="hourly-dir flex items-center gap-1 text-[11px] text-muted mt-1">
                      <Navigation size={10} style={{ transform: `rotate(${hourly.wind_direction_10m[idx]}deg)` }} className="shrink-0" />
                      <span>{dirName}</span>
                    </div>

                    <div className="hourly-stat mt-1">
                      <CloudRain size={12} className="text-muted shrink-0" />
                      <span className="text-xs text-white">{rain} mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MONITORES AGRONÓMICOS TÉCNICOS (Delta T, Inversión Térmica, Piso en Lote, Heladas) */}
          <div className="glass-panel mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg">
                <Gauge size={20} color="var(--primary-hover)" /> Monitores de Parámetros de Aplicación
              </h2>
              <span className="text-xs text-muted hidden sm:inline">Delta T, Inversión, Piso y Heladas</span>
            </div>

            <div className="insights-grid">
              {/* Delta T Monitor Card */}
              {deltaT && (
                <div className={`insight-card insight-border-${deltaT.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <Gauge size={18} className="text-primary" />
                      <span className="font-bold text-white text-sm">Delta T (Evaporación)</span>
                    </div>
                    <span className={`status-badge badge-${deltaT.status}`}>
                      {deltaT.deltaT} °C
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">Zona: {deltaT.zone}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{deltaT.advice}</p>
                </div>
              )}

              {/* Thermal Inversion Risk Card */}
              {thermalInversion && (
                <div className={`insight-card insight-border-${thermalInversion.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-yellow-400" />
                      <span className="font-bold text-white text-sm">Inversión Térmica</span>
                    </div>
                    <span className={`status-badge badge-${thermalInversion.status}`}>
                      {thermalInversion.status === 'green' ? 'BAJO RIESGO' : thermalInversion.status === 'yellow' ? 'MODERADO' : 'ALTO RIESGO'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">{thermalInversion.title}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{thermalInversion.advice}</p>
                </div>
              )}

              {/* Soil Trafficability Card */}
              {soilTraffic && (
                <div className={`insight-card insight-border-${soilTraffic.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-blue" />
                      <span className="font-bold text-white text-sm">Piso en Lote</span>
                    </div>
                    <span className={`status-badge badge-${soilTraffic.status}`}>
                      {soilTraffic.status === 'green' ? 'TRANSITABLE' : soilTraffic.status === 'yellow' ? 'PRECAUCIÓN' : 'BARRO'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">{soilTraffic.title}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{soilTraffic.advice}</p>
                </div>
              )}

              {/* Frost Risk Card */}
              {frostRisk && (
                <div className={`insight-card insight-border-${frostRisk.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <Snowflake size={18} className="text-blue" />
                      <span className="font-bold text-white text-sm">Riesgo de Heladas</span>
                    </div>
                    <span className={`status-badge badge-${frostRisk.status}`}>
                      {frostRisk.status === 'green' ? 'SIN HELADAS' : frostRisk.status === 'yellow' ? 'ALERTA ESCARCHA' : 'HELADA SEVERA'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">{frostRisk.title}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{frostRisk.advice}</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-muted p-8">No se pudieron cargar los datos.</p>
      )}

      {/* Windy Interactive Radar Map */}
      <div className="glass-panel">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <h2 className="text-base md:text-lg flex items-center gap-2">
            <Wind size={20} color="var(--primary-hover)" /> Radar Interactivo de Viento y Lluvia (Windy)
          </h2>
          <span className="text-xs text-muted">Ubicación: {selectedCity.name}</span>
        </div>
        <div className="iframe-container">
          <iframe 
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=${selectedCity.lat}&lon=${selectedCity.lon}&detailLat=${selectedCity.lat}&detailLon=${selectedCity.lon}`}
            title="Windy Map"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default App;
