import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, Droplets, MapPin, Navigation, Thermometer, 
  CloudRain, Calendar, Clock, Search, X, Sprout, ShieldAlert,
  Gauge, AlertTriangle, Truck, Snowflake, Sunrise, Sunset,
  Sun, Award, CheckCircle2, XCircle, AlertCircle, Play,
  Compass, CloudSun, BarChart3, CheckSquare, Info, Sparkles
} from 'lucide-react';
import { 
  fetchWeather, searchCities, POPULAR_CITIES, DEFAULT_CITY,
  getWindDirectionName, getWeatherDescription,
  formatTimeHHMM, calculateDaylightDuration
} from './utils/weather';
import { 
  evaluateConditions, calculateDeltaT, 
  evaluateThermalInversion, evaluateSoilTrafficability, 
  evaluateFrostRisk, analyzeWeeklySprayingWindows
} from './utils/rules';

function App() {
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY); // Default Necochea
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
  const daily = weatherData?.daily;

  // Perform weekly operational analysis
  const weeklyAnalysis = weatherData ? analyzeWeeklySprayingWindows(weatherData) : null;
  const todayAnalysis = weeklyAnalysis?.today;
  const bestDay = weeklyAnalysis?.bestDayOfWeek;

  // Compute total weekly operational hours & rainfall
  const totalWeeklyGreenHours = weeklyAnalysis?.days ? weeklyAnalysis.days.reduce((acc, d) => acc + d.greenCount, 0) : 0;
  const totalWeeklyRainfall = daily?.precipitation_sum ? daily.precipitation_sum.reduce((acc, val) => acc + val, 0).toFixed(1) : 0;
  const maxWeeklyGust = daily?.wind_gusts_10m_max ? Math.max(...daily.wind_gusts_10m_max) : 0;

  // Compute immediate spray status
  const currentSprayEval = current ? evaluateConditions('pulverizar', current) : null;

  // Formatted current date string
  const getFormattedTodayDate = () => {
    const date = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = days[date.getDay()];
    const dayNum = date.getDate().toString().padStart(2, '0');
    const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearNum = date.getFullYear();
    return `${dayName} ${dayNum}/${monthNum}/${yearNum}`;
  };

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
      {/* Centered Header & Search Bar */}
      <header className="app-header glass-panel mb-6 flex flex-col items-center text-center">
        <div className="brand flex flex-col items-center gap-2 mb-4">
          <div className="brand-icon">
            <Sprout size={40} className="text-primary-brand" />
          </div>
          <div>
            <h1 className="brand-title flex items-center justify-center gap-2 text-2xl md:text-3xl font-black">
              CheClima
            </h1>
            <p className="text-xs md:text-sm text-dark font-medium mt-1">
              Monitor de decisiones para Fumigar, Pulverizar, Sembrar y Cosechar
            </p>
          </div>
        </div>

        {/* Centered Search Box */}
        <div className="search-wrapper w-full max-w-xl mx-auto" ref={searchContainerRef}>
          <div className="search-input-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar cualquier ciudad o localidad (ej. Necochea, Balcarce, Pergamino)..."
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
                <X size={18} />
              </button>
            )}
          </div>

          {/* Dropdown Results */}
          {showDropdown && (searchResults.length > 0 || isSearching) && (
            <div className="search-dropdown glass-panel text-left">
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
                      <span className="font-medium text-dark">{item.name}</span>
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

        {/* Selected City Info & Quick Cities Centered */}
        <div className="mt-4 pt-4 border-t border-glass w-full flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2 text-dark font-black">
            <MapPin size={22} className="text-primary-brand shrink-0" />
            <span className="text-xl md:text-2xl">{selectedCity.name}</span>
            <span className="text-sm text-muted font-bold">
              {[selectedCity.admin1, selectedCity.country].filter(Boolean).join(', ')}
            </span>
          </div>

          {/* Popular City Quick Buttons Centered */}
          <div className="popular-cities flex flex-wrap items-center justify-center gap-1-5">
            <span className="text-xs text-muted font-bold mr-1">Localidades:</span>
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
          <p className="text-dark font-bold text-sm">Calculando ventanas operativas y condiciones para {selectedCity.name}...</p>
        </div>
      ) : current ? (
        <>
          {/* HERO PANORAMA CARD */}
          <div className="glass-panel hero-panorama-card mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-glass pb-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-brand shrink-0" />
                  <span className="text-xs text-dark font-extrabold uppercase tracking-wider">Panorama de Campo</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-dark mt-1">
                  {selectedCity.name}: ¿Conviene fumigar/pulverizar hoy? <span className="text-sm md:text-base font-bold text-muted">({getFormattedTodayDate()})</span>
                </h2>
              </div>

              {/* Immediate Status Badge aligned to right */}
              <div className={`spray-now-badge badge-hero-${currentSprayEval?.status} shrink-0`}>
                {currentSprayEval?.status === 'green' && <CheckCircle2 size={24} className="shrink-0" />}
                {currentSprayEval?.status === 'yellow' && <AlertCircle size={24} className="shrink-0" />}
                {currentSprayEval?.status === 'red' && <XCircle size={24} className="shrink-0" />}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider">Estado Actual</div>
                  <div className="text-sm font-black">
                    {currentSprayEval?.status === 'green' ? '🟢 100% OPERATIVO AHORA' : currentSprayEval?.status === 'yellow' ? '🟡 OPERATIVO CON PRECAUCIÓN' : '🔴 NO OPERATIVO AHORA'}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 1: 3 Cards in a Single Row */}
            <div className="hero-three-cards-grid">
              {/* Card 1: Ventana Horaria Operativa Hoy */}
              <div className="panorama-box green-highlight">
                <div className="flex items-center gap-2 mb-1 text-primary-brand font-black text-xs uppercase">
                  <Play size={16} /> Ventana Horaria Operativa Hoy
                </div>
                <div className="text-base md:text-lg font-black text-dark">
                  {todayAnalysis?.windows?.length > 0 ? todayAnalysis.windows.join(' | ') : 'Sin ventana óptima continua'}
                </div>
                <span className="text-xs text-muted mt-1 font-medium">Horario apto para pulverizar/fumigar</span>
              </div>

              {/* Card 2: Diagnóstico & Estado */}
              <div className="panorama-box amber-highlight">
                <div className="flex items-center gap-2 mb-1 text-amber-800 font-black text-xs uppercase">
                  <ShieldAlert size={16} /> Diagnóstico en Lote Hoy
                </div>
                <div className="text-xs md:text-sm font-bold text-dark leading-snug">
                  {currentSprayEval?.message}
                </div>
                <span className="text-xs text-muted mt-1 font-medium">Viento: {current.wind_speed_10m} km/h • Delta T: {deltaT?.deltaT}°C</span>
              </div>

              {/* Card 3: Horarios de Luz Solar */}
              <div className="panorama-box blue-highlight">
                <div className="flex items-center gap-2 mb-1 text-blue-700 font-black text-xs uppercase">
                  <Sun size={16} /> Salida y Puesta del Sol
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1 text-xs text-dark font-bold">
                    <Sunrise size={16} className="text-amber-500 shrink-0" />
                    <span>Salida: {formatTimeHHMM(todayAnalysis?.sunrise)} hs</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-dark font-bold">
                    <Sunset size={16} className="text-orange-500 shrink-0" />
                    <span>Puesta: {formatTimeHHMM(todayAnalysis?.sunset)} hs</span>
                  </div>
                </div>
                <div className="text-xs text-muted mt-1 font-medium">
                  Luz solar disponible: <strong>{calculateDaylightDuration(todayAnalysis?.sunrise, todayAnalysis?.sunset)}</strong>
                </div>
              </div>
            </div>

            {/* Row 2: Prominent Single Full-Width Banner for Best Day */}
            {bestDay && (
              <div className="best-day-banner-prominent mt-4 w-full">
                <div className="best-day-icon-circle shrink-0">
                  <Award size={32} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-amber-900 tracking-wider bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                      🏆 MEJOR DÍA DE LA SEMANA PARA FUMIGAR / PULVERIZAR
                    </span>
                  </div>
                  <div className="text-lg md:text-xl font-black text-dark mt-1">
                    {getDayName(bestDay.dateStr, bestDay.dayIndex)} ({formatDateShort(bestDay.dateStr)}) — <span className="text-emerald-800">{bestDay.greenCount} horas de ventana óptima</span>
                  </div>
                  <div className="text-xs md:text-sm text-dark font-semibold mt-0.5">
                    {bestDay.windows.length > 0 ? `Ventanas recomendadas: ${bestDay.windows.join(' y ')}.` : 'Día con menor viento y lluvias.'} Viento máx: {bestDay.maxWind} km/h (Ráf: {bestDay.maxGust} km/h).
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN GRID: CURRENT WEATHER METRICS & AG-TASKS */}
          <div className="main-grid mb-6">
            {/* Current Weather Card */}
            <div className="glass-panel weather-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <Thermometer size={20} className="text-primary-brand" /> Clima Actual en {selectedCity.name}
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
                      <Wind size={18} className="text-primary-brand" />
                      <span className="text-xs text-muted font-bold uppercase tracking-wider">Viento</span>
                    </div>
                    <div className="text-xl font-black text-dark">
                      {current.wind_speed_10m} <span className="text-sm font-normal text-muted">km/h</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Ráfagas: <strong className="text-dark">{current.wind_gusts_10m} km/h</strong>
                    </div>
                    <div className="wind-direction-pill mt-2 flex items-center gap-1-5">
                      <Navigation 
                        size={14} 
                        style={{ transform: `rotate(${current.wind_direction_10m}deg)` }} 
                        className="shrink-0 text-primary-brand"
                      />
                      <span>Viento del <strong>{getWindDirectionName(current.wind_direction_10m)}</strong></span>
                      <span className="text-xs text-muted">({current.wind_direction_10m}°)</span>
                    </div>
                  </div>

                  {/* Humidity Metric */}
                  <div className="metric-box">
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets size={18} className="text-blue-500" />
                      <span className="text-xs text-muted font-bold uppercase tracking-wider">Humedad</span>
                    </div>
                    <div className="text-xl font-black text-dark">{current.relative_humidity_2m}%</div>
                    <span className="text-xs text-muted mt-1">Humedad relativa</span>
                  </div>

                  {/* Precipitation Metric */}
                  <div className="metric-box">
                    <div className="flex items-center gap-2 mb-1">
                      <CloudRain size={18} className="text-blue-500" />
                      <span className="text-xs text-muted font-bold uppercase tracking-wider">Lluvia</span>
                    </div>
                    <div className="text-xl font-black text-dark">{current.precipitation} <span className="text-sm font-normal text-muted">mm</span></div>
                    <span className="text-xs text-muted mt-1">Precipitación actual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* General Agricultural Task Semaphore */}
            <div className="glass-panel tasks-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <ShieldAlert size={20} className="text-primary-brand" /> Semáforo de Labores
                </h2>
                <span className="text-xs text-muted font-medium">Evaluación de campo</span>
              </div>

              <div className="tasks-grid">
                {['pulverizar', 'sembrar', 'cosechar'].map((task) => {
                  const rules = evaluateConditions(task, current);
                  return (
                    <div key={task} className={`state-card state-border-${rules.status}`}>
                      <div className="state-header">
                        <span className="font-extrabold capitalize text-dark flex items-center gap-2 text-sm">
                          {task === 'pulverizar' && <Wind size={16} />}
                          {task === 'sembrar' && <Sprout size={16} />}
                          {task === 'cosechar' && <Calendar size={16} />}
                          {task === 'pulverizar' ? 'Pulverizar / Fumigar' : task}
                        </span>
                        <span className={`status-badge badge-${rules.status}`}>
                          {rules.status === 'green' ? '100% OPERATIVO' : rules.status === 'yellow' ? 'PRECAUCIÓN' : 'NO OPERATIVO'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-2 leading-relaxed">{rules.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PLANIFICADOR SEMANAL EN TARJETAS DE PRONÓSTICO MULTI-TAREA (7 DÍAS + 2 SLOTS AGRONÓMICOS) */}
          <div className="glass-panel mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar size={20} className="text-primary-brand" /> Planificador Semanal de Labores Agrícolas (7 Días)
                </h2>
                <p className="text-xs text-muted mt-0.5">Evaluación diaria completa de Pulverización/Fumigación, Siembra y Cosecha</p>
              </div>
              <span className="text-xs font-bold text-dark bg-glass-light px-3 py-1 rounded-full border border-glass">
                Necochea y Zona • 7 Días
              </span>
            </div>

            <div className="forecast-cards-grid">
              {/* 7 Daily Forecast Cards evaluating ALL 3 tasks */}
              {weeklyAnalysis?.days?.map((dayInfo, idx) => {
                const dayName = getDayName(dayInfo.dateStr, idx);
                const dateFormatted = formatDateShort(dayInfo.dateStr);

                return (
                  <div 
                    key={idx} 
                    className={`forecast-day-card card-status-${dayInfo.overallStatus} ${idx === 0 ? 'today-active-card' : ''}`}
                  >
                    {/* Card Top Header */}
                    <div className="card-top-header">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-dark text-base">{dayName}</span>
                          <span className="text-xs text-muted font-bold">{dateFormatted}</span>
                          {idx === 0 && <span className="today-badge">HOY</span>}
                        </div>
                        <span className="text-xs text-muted flex items-center gap-1 mt-0.5 font-medium">
                          <CloudSun size={13} className="text-muted" />
                          {getWeatherDescription(dayInfo.weatherCode)}
                        </span>
                      </div>

                      {/* Temperature Range Pill */}
                      <div className="card-temp-pill">
                        <span className="font-black text-dark">{Math.round(dayInfo.maxTemp)}°</span>
                        <span className="text-muted text-xs font-bold">/ {Math.round(dayInfo.minTemp)}°</span>
                      </div>
                    </div>

                    {/* ALL 3 FIELD TASKS EVALUATION */}
                    <div className="card-tasks-multi-section mt-3 flex flex-col gap-2">
                      {/* Task 1: Pulverización / Fumigación */}
                      <div className="task-row-item pb-2 border-b border-white/20">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="flex items-center gap-1.5 text-dark">
                            <Wind size={13} className="text-primary-brand shrink-0" />
                            Pulverizar / Fumigar
                          </span>
                          <span className={`status-badge badge-${dayInfo.overallStatus}`}>
                            {dayInfo.overallStatus === 'green' ? 'ÓPTIMO' : dayInfo.overallStatus === 'yellow' ? 'PRECAUCIÓN' : 'NO APTO'}
                          </span>
                        </div>
                        {dayInfo.windows.length > 0 ? (
                          <div className="text-[11px] font-black text-emerald-950 bg-emerald-100/90 p-1.5 rounded border border-emerald-300/60">
                            Ventana: {dayInfo.windows.join(' | ')}
                          </div>
                        ) : (
                          <div className="text-[11px] font-bold text-rose-900 bg-rose-100/90 p-1.5 rounded border border-rose-300/60">
                            Restricción: {dayInfo.nonOperationalReason}
                          </div>
                        )}
                      </div>

                      {/* Task 2: Siembra */}
                      <div className="task-row-item py-2 border-b border-white/20">
                        <div className="flex items-center justify-between text-xs font-bold mb-0.5">
                          <span className="flex items-center gap-1.5 text-dark">
                            <Sprout size={13} className="text-emerald-700 shrink-0" />
                            Siembra
                          </span>
                          <span className={`status-badge badge-${dayInfo.sowEval.status}`}>
                            {dayInfo.sowEval.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted font-medium">
                          {dayInfo.sowEval.reason}
                        </div>
                      </div>

                      {/* Task 3: Cosecha / Trilla */}
                      <div className="task-row-item pt-1">
                        <div className="flex items-center justify-between text-xs font-bold mb-0.5">
                          <span className="flex items-center gap-1.5 text-dark">
                            <Calendar size={13} className="text-amber-700 shrink-0" />
                            Cosecha / Trilla
                          </span>
                          <span className={`status-badge badge-${dayInfo.harvestEval.status}`}>
                            {dayInfo.harvestEval.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted font-medium">
                          {dayInfo.harvestEval.reason}
                        </div>
                      </div>
                    </div>

                    {/* Wind Shifts Timeline */}
                    <div className="card-wind-shifts mt-3 pt-3 border-t border-glass">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                        <Compass size={13} className="text-primary-brand" /> Cambios del Viento en el Día
                      </div>

                      <div className="wind-shifts-grid">
                        {dayInfo.windShifts.map((shift, sIdx) => (
                          <div key={sIdx} className="wind-shift-item">
                            <span className="text-[10px] text-muted uppercase font-bold">{shift.period.split(' ')[0]}</span>
                            <span className="text-xs font-black text-dark flex items-center gap-1">
                              <Navigation size={10} className="text-muted" style={{ transform: 'rotate(0deg)' }} />
                              {shift.dir} {shift.speed} <span className="text-[10px] font-normal text-muted">km/h</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer: Sun & Rain Metrics */}
                    <div className="card-footer-metrics mt-3 pt-2 border-t border-glass flex items-center justify-between text-xs text-muted font-medium">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Sunrise size={12} className="text-amber-500 shrink-0" /> {formatTimeHHMM(dayInfo.sunrise)}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Sunset size={12} className="text-orange-500 shrink-0" /> {formatTimeHHMM(dayInfo.sunset)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {dayInfo.rainSum > 0 ? (
                          <span className="flex items-center gap-1 text-blue-700 text-[11px] font-black">
                            <CloudRain size={12} /> {dayInfo.rainSum} mm
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted">Sin lluvia</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Slot 8: Resumen Estadístico Semanal de Campo */}
              <div className="forecast-day-card summary-card-slot">
                <div className="card-top-header mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary-brand shrink-0" />
                    <span className="font-black text-dark text-base">Resumen Semanal</span>
                  </div>
                  <span className="weather-badge">7 Días</span>
                </div>

                <p className="text-xs text-muted mb-3 leading-relaxed">
                  Consolidado meteorológico acumulado para la planificación de tareas en Necochea.
                </p>

                <div className="summary-stats-grid">
                  <div className="summary-stat-box">
                    <span className="text-[11px] text-muted font-bold">Horas Operativas Totales</span>
                    <span className="text-lg font-black text-emerald-700">{totalWeeklyGreenHours} hs</span>
                  </div>

                  <div className="summary-stat-box">
                    <span className="text-[11px] text-muted font-bold">Lluvia Acumulada</span>
                    <span className="text-lg font-black text-blue-700">{totalWeeklyRainfall} mm</span>
                  </div>

                  <div className="summary-stat-box">
                    <span className="text-[11px] text-muted font-bold">Ráfaga Máxima Semanal</span>
                    <span className="text-lg font-black text-amber-700">{maxWeeklyGust} km/h</span>
                  </div>
                </div>
              </div>

              {/* Slot 9: Buenas Prácticas Agrícolas (BPA) */}
              <div className="forecast-day-card summary-card-slot">
                <div className="card-top-header mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={20} className="text-primary-brand shrink-0" />
                    <span className="font-black text-dark text-base">Guía BPA Pulverización</span>
                  </div>
                  <span className="today-badge">BPA</span>
                </div>

                <p className="text-xs text-muted mb-2 leading-relaxed">
                  Reglas recomendadas para optimizar la eficiencia de los agroquímicos en lote:
                </p>

                <ul className="bpa-checklist text-xs text-dark">
                  <li>🟢 <strong>Viento óptimo:</strong> 3 a 15 km/h (evita deriva e inversión).</li>
                  <li>🟢 <strong>Delta T ideal:</strong> 2°C a 8°C (evita evaporación rápida).</li>
                  <li>🟡 <strong>Ráfagas &gt; 15 km/h:</strong> Usar pastillas antideriva / aire.</li>
                  <li>🔴 <strong>Temp &gt; 30°C / Delta T &gt; 10°C:</strong> Suspender aplicaciones.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* MONITORES AGRONÓMICOS TÉCNICOS (Delta T, Inversión Térmica, Piso en Lote, Heladas) */}
          <div className="glass-panel mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg">
                <Gauge size={20} className="text-primary-brand" /> Monitores de Parámetros de Aplicación
              </h2>
              <span className="text-xs text-muted hidden sm:inline">Delta T, Inversión, Piso y Heladas</span>
            </div>

            <div className="insights-grid">
              {/* Delta T Monitor Card */}
              {deltaT && (
                <div className={`insight-card insight-border-${deltaT.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <Gauge size={18} className="text-primary-brand" />
                      <span className="font-bold text-dark text-sm">Delta T (Evaporación)</span>
                    </div>
                    <span className={`status-badge badge-${deltaT.status}`}>
                      {deltaT.deltaT} °C
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-dark mt-1">Zona: {deltaT.zone}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{deltaT.advice}</p>
                </div>
              )}

              {/* Thermal Inversion Risk Card */}
              {thermalInversion && (
                <div className={`insight-card insight-border-${thermalInversion.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-600" />
                      <span className="font-bold text-dark text-sm">Inversión Térmica</span>
                    </div>
                    <span className={`status-badge badge-${thermalInversion.status}`}>
                      {thermalInversion.status === 'green' ? 'BAJO RIESGO' : thermalInversion.status === 'yellow' ? 'MODERADO' : 'ALTO RIESGO'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-dark mt-1">{thermalInversion.title}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{thermalInversion.advice}</p>
                </div>
              )}

              {/* Soil Trafficability Card */}
              {soilTraffic && (
                <div className={`insight-card insight-border-${soilTraffic.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-blue-600" />
                      <span className="font-bold text-dark text-sm">Piso en Lote</span>
                    </div>
                    <span className={`status-badge badge-${soilTraffic.status}`}>
                      {soilTraffic.status === 'green' ? 'TRANSITABLE' : soilTraffic.status === 'yellow' ? 'PRECAUCIÓN' : 'BARRO'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-dark mt-1">{soilTraffic.title}</div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{soilTraffic.advice}</p>
                </div>
              )}

              {/* Frost Risk Card */}
              {frostRisk && (
                <div className={`insight-card insight-border-${frostRisk.status}`}>
                  <div className="insight-header">
                    <div className="flex items-center gap-2">
                      <Snowflake size={18} className="text-blue-600" />
                      <span className="font-bold text-dark text-sm">Riesgo de Heladas</span>
                    </div>
                    <span className={`status-badge badge-${frostRisk.status}`}>
                      {frostRisk.status === 'green' ? 'SIN HELADAS' : frostRisk.status === 'yellow' ? 'ALERTA ESCARCHA' : 'HELADA SEVERA'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-dark mt-1">{frostRisk.title}</div>
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
            <Wind size={20} className="text-primary-brand" /> Radar Interactivo de Viento y Lluvia (Windy)
          </h2>
          <span className="text-xs text-muted font-bold">Ubicación: {selectedCity.name}</span>
        </div>
        <div className="iframe-container">
          <iframe 
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=${selectedCity.lat}&lon=${selectedCity.lon}&detailLat=${selectedCity.lat}&detailLon=${selectedCity.lon}`}
            title="Windy Map"
          ></iframe>
        </div>
      </div>

      {/* Styled Harmonious Glass Footer */}
      <footer className="glass-panel app-footer mt-8 py-6 px-4 text-center flex flex-col items-center justify-center gap-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100/80 border border-emerald-300/60 flex items-center justify-center">
            <Sprout size={18} className="text-primary-brand" />
          </div>
          <span className="font-black text-dark text-lg tracking-tight">CheClima</span>
          <span className="text-[10px] font-extrabold uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-full tracking-wider">
            Monitor Agro
          </span>
        </div>

        <p className="text-xs md:text-sm text-dark font-semibold max-w-2xl leading-relaxed">
          Creado por <strong className="text-emerald-950 font-black">Juan Francisco Natale</strong> mediante desarrollo por inteligencia artificial en conjunto con la API de <strong className="text-emerald-950 font-black">granos.ar</strong>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-[11px] text-muted font-medium">
          <span className="bg-glass-light px-2.5 py-1 rounded-full border border-glass">Necochea & Prov. de Buenos Aires</span>
          <span>•</span>
          <span className="bg-glass-light px-2.5 py-1 rounded-full border border-glass">Pronóstico 7 Días & Hora por Hora</span>
          <span>•</span>
          <span className="bg-glass-light px-2.5 py-1 rounded-full border border-glass">BPA & Labores Agrícolas</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
