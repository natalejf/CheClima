import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, Droplets, MapPin, Navigation, Thermometer, 
  CloudRain, Calendar, Clock, Search, X, Sprout, ShieldAlert,
  Gauge, AlertTriangle, Truck, Snowflake, Sunrise, Sunset,
  Sun, Award, CheckCircle2, XCircle, AlertCircle, Play,
  Compass, CloudSun, BarChart3, CheckSquare, Info, Sparkles,
  Activity, Zap, Eye, Radio
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
  const [searchQuery, setSearchQuery] = useState('Necochea');
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

  // Get current time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      {/* ═══ HEADER ═══ */}
      <header className="app-header glass-panel mb-6 py-6 px-4 md:px-8" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <div style={{ 
            width: '38px', height: '38px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.15))', 
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sprout size={22} style={{ color: '#22c55e' }} />
          </div>
          <h1 className="brand-title" style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
            CheClima
          </h1>
          <span style={{ 
            fontSize: '0.55rem', fontWeight: 800, background: 'rgba(34, 197, 94, 0.15)', 
            color: '#86efac', padding: '0.15rem 0.5rem', borderRadius: '99px', 
            border: '1px solid rgba(34, 197, 94, 0.3)', letterSpacing: '0.05em', textTransform: 'uppercase'
          }}>
            MONITOR
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginBottom: '1.15rem', letterSpacing: '0.01em' }}>
          Monitor agroclimático para Fumigación · Pulverización · Siembra · Cosecha
        </p>

        {/* Search */}
        <div className="search-wrapper" style={{ maxWidth: '520px', margin: '0 auto' }} ref={searchContainerRef}>
          <div className="search-input-box" style={{ borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar localidad (ej. Necochea, Balcarce, Pergamino)..."
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

          {showDropdown && (searchResults.length > 0 || isSearching) && (
            <div className="search-dropdown">
              {isSearching ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>Buscando localidades...</div>
              ) : (
                searchResults.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="search-item"
                    onClick={() => {
                      handleSelectCity(item);
                      setSearchQuery(item.name);
                    }}
                  >
                    <MapPin size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.4rem' }}>
                        {[item.admin1, item.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Location Pill */}
        <div style={{ 
          marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0'
        }}>
          <MapPin size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span>{selectedCity.name}</span>
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
            {[selectedCity.admin1, selectedCity.country].filter(Boolean).join(', ')}
          </span>
          <span style={{ 
            width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', 
            boxShadow: '0 0 6px rgba(34,197,94,0.5)', display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            LIVE
          </span>
        </div>
      </header>

      {loading ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
          <div className="loader" style={{ marginBottom: '1rem' }}></div>
          <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem' }}>Calculando ventanas operativas...</p>
          <p style={{ color: '#64748b', fontWeight: 500, fontSize: '0.72rem', marginTop: '0.25rem' }}>Conectando con modelos meteorológicos para {selectedCity.name}</p>
        </div>
      ) : current ? (
        <>
          {/* ═══ HERO PANORAMA ═══ */}
          <div className="glass-panel hero-panorama-card mb-6">
            {/* Top Row: Title + Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <Activity size={14} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Panorama de Campo</span>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{getFormattedTodayDate()}</span>
                  </div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.3 }}>
                    {selectedCity.name}: ¿Conviene operar hoy?
                  </h2>
                </div>

                {/* Status Badge */}
                <div className={`spray-now-badge badge-hero-${currentSprayEval?.status}`} style={{ flexShrink: 0 }}>
                  {currentSprayEval?.status === 'green' && <CheckCircle2 size={22} style={{ flexShrink: 0 }} />}
                  {currentSprayEval?.status === 'yellow' && <AlertCircle size={22} style={{ flexShrink: 0 }} />}
                  {currentSprayEval?.status === 'red' && <XCircle size={22} style={{ flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>Estado Actual</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>
                      {currentSprayEval?.status === 'green' ? '🟢 OPERATIVO' : currentSprayEval?.status === 'yellow' ? '🟡 PRECAUCIÓN' : '🔴 NO OPERATIVO'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Panorama Cards */}
            <div className="hero-three-cards-grid">
              {/* Ventana Horaria */}
              <div className="panorama-box green-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <Play size={13} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ventana Operativa</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#f1f5f9' }}>
                  {todayAnalysis?.windows?.length > 0 ? todayAnalysis.windows.join(' | ') : 'Sin ventana óptima'}
                </div>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 500 }}>Horario apto para pulverizar</span>
              </div>

              {/* Diagnóstico */}
              <div className="panorama-box amber-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <ShieldAlert size={13} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '0.6rem', color: '#fcd34d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diagnóstico</span>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
                  {currentSprayEval?.message}
                </div>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 500 }}>
                  Viento: {current.wind_speed_10m} km/h • ΔT: {deltaT?.deltaT}°C
                </span>
              </div>

              {/* Sol */}
              <div className="panorama-box blue-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <Sun size={13} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '0.6rem', color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Luz Solar</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sunrise size={14} style={{ color: '#fcd34d', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0' }}>{formatTimeHHMM(todayAnalysis?.sunrise)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sunset size={14} style={{ color: '#fdba74', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0' }}>{formatTimeHHMM(todayAnalysis?.sunset)}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.35rem', fontWeight: 500 }}>
                  Duración: <strong style={{ color: '#e2e8f0' }}>{calculateDaylightDuration(todayAnalysis?.sunrise, todayAnalysis?.sunset)}</strong>
                </span>
              </div>
            </div>

            {/* Best Day Banner */}
            {bestDay && (
              <div className="best-day-banner-prominent" style={{ marginTop: '1rem' }}>
                <div className="best-day-icon-circle">
                  <Award size={28} style={{ color: '#fcd34d' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', color: '#fcd34d',
                      background: 'rgba(245,158,11,0.15)', padding: '0.15rem 0.55rem', borderRadius: '99px',
                      border: '1px solid rgba(245,158,11,0.3)', letterSpacing: '0.04em'
                    }}>
                      🏆 Mejor día para operar
                    </span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#f1f5f9', marginTop: '0.3rem' }}>
                    {getDayName(bestDay.dateStr, bestDay.dayIndex)} ({formatDateShort(bestDay.dateStr)}) — <span style={{ color: '#86efac' }}>{bestDay.greenCount} hs óptimas</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.15rem' }}>
                    {bestDay.windows.length > 0 ? `Ventanas: ${bestDay.windows.join(' y ')}.` : 'Menor viento y lluvias.'} Viento máx: {bestDay.maxWind} km/h
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ MAIN GRID: Weather + Tasks ═══ */}
          <div className="main-grid mb-6">
            {/* Current Weather */}
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <Thermometer size={18} style={{ color: '#22c55e' }} /> Clima Actual
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
                  {/* Wind */}
                  <div className="metric-box highlighted">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <Wind size={16} style={{ color: '#22c55e' }} />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Viento</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f1f5f9' }}>
                      {current.wind_speed_10m} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#94a3b8' }}>km/h</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Ráfagas: <strong style={{ color: '#e2e8f0' }}>{current.wind_gusts_10m} km/h</strong>
                    </div>
                    <div className="wind-direction-pill" style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Navigation 
                        size={12} 
                        style={{ transform: `rotate(${current.wind_direction_10m}deg)`, color: '#22c55e', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '0.65rem' }}>{getWindDirectionName(current.wind_direction_10m)}</span>
                      <span style={{ fontSize: '0.6rem', color: '#64748b' }}>({current.wind_direction_10m}°)</span>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="metric-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <Droplets size={16} style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Humedad</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f1f5f9' }}>{current.relative_humidity_2m}%</div>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.2rem' }}>Humedad relativa</span>
                  </div>

                  {/* Precipitation */}
                  <div className="metric-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <CloudRain size={16} style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lluvia</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f1f5f9' }}>{current.precipitation} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#94a3b8' }}>mm</span></div>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.2rem' }}>Precipitación actual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Semaphore */}
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <ShieldAlert size={18} style={{ color: '#22c55e' }} /> Semáforo de Labores
                </h2>
                <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>Evaluación en tiempo real</span>
              </div>

              <div className="tasks-grid">
                {['pulverizar', 'sembrar', 'cosechar'].map((task) => {
                  const rules = evaluateConditions(task, current);
                  return (
                    <div key={task} className={`state-card state-border-${rules.status}`}>
                      <div className="state-header">
                        <span style={{ fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', textTransform: 'capitalize' }}>
                          {task === 'pulverizar' && <Wind size={15} style={{ color: '#22c55e' }} />}
                          {task === 'sembrar' && <Sprout size={15} style={{ color: '#10b981' }} />}
                          {task === 'cosechar' && <Calendar size={15} style={{ color: '#f59e0b' }} />}
                          {task === 'pulverizar' ? 'Pulverizar / Fumigar' : task}
                        </span>
                        <span className={`status-badge badge-${rules.status}`}>
                          {rules.status === 'green' ? 'OPERATIVO' : rules.status === 'yellow' ? 'PRECAUCIÓN' : 'NO OPERATIVO'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.4rem', lineHeight: 1.5 }}>{rules.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══ MONITORES AGRONÓMICOS ═══ */}
          <div className="glass-panel mb-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                <Gauge size={18} style={{ color: '#22c55e' }} /> Monitores de Aplicación
              </h2>
              <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600, display: 'none' }} className="sm:inline">Delta T · Inversión · Piso · Heladas</span>
            </div>

            <div className="insights-grid">
              {/* Delta T */}
              {deltaT && (
                <div className={`insight-card insight-border-${deltaT.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Gauge size={16} style={{ color: '#22c55e' }} />
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.78rem' }}>Delta T</span>
                    </div>
                    <span className={`status-badge badge-${deltaT.status}`}>
                      {deltaT.deltaT} °C
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.2rem' }}>Zona: {deltaT.zone}</div>
                  <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.5 }}>{deltaT.advice}</p>
                </div>
              )}

              {/* Thermal Inversion */}
              {thermalInversion && (
                <div className={`insight-card insight-border-${thermalInversion.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.78rem' }}>Inversión Térmica</span>
                    </div>
                    <span className={`status-badge badge-${thermalInversion.status}`}>
                      {thermalInversion.status === 'green' ? 'BAJO' : thermalInversion.status === 'yellow' ? 'MODERADO' : 'ALTO'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.2rem' }}>{thermalInversion.title}</div>
                  <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.5 }}>{thermalInversion.advice}</p>
                </div>
              )}

              {/* Soil */}
              {soilTraffic && (
                <div className={`insight-card insight-border-${soilTraffic.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Truck size={16} style={{ color: '#3b82f6' }} />
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.78rem' }}>Piso en Lote</span>
                    </div>
                    <span className={`status-badge badge-${soilTraffic.status}`}>
                      {soilTraffic.status === 'green' ? 'TRANSITABLE' : soilTraffic.status === 'yellow' ? 'PRECAUCIÓN' : 'BARRO'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.2rem' }}>{soilTraffic.title}</div>
                  <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.5 }}>{soilTraffic.advice}</p>
                </div>
              )}

              {/* Frost */}
              {frostRisk && (
                <div className={`insight-card insight-border-${frostRisk.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Snowflake size={16} style={{ color: '#3b82f6' }} />
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.78rem' }}>Heladas</span>
                    </div>
                    <span className={`status-badge badge-${frostRisk.status}`}>
                      {frostRisk.status === 'green' ? 'SIN RIESGO' : frostRisk.status === 'yellow' ? 'ALERTA' : 'HELADA'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.2rem' }}>{frostRisk.title}</div>
                  <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.5 }}>{frostRisk.advice}</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══ PLANIFICADOR SEMANAL ═══ */}
          <div className="glass-panel mb-6">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <Calendar size={18} style={{ color: '#22c55e' }} /> Planificador Semanal
                </h2>
                <p style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.15rem' }}>Evaluación diaria de Pulverización, Siembra y Cosecha</p>
              </div>
              <span style={{ 
                fontSize: '0.58rem', fontWeight: 700, color: '#94a3b8', 
                background: 'rgba(30,41,59,0.5)', padding: '0.3rem 0.65rem', borderRadius: '99px',
                border: '1px solid rgba(148,163,184,0.12)'
              }}>
                {selectedCity.name} · 7 Días
              </span>
            </div>

            <div className="forecast-cards-grid">
              {weeklyAnalysis?.days?.map((dayInfo, idx) => {
                const dayName = getDayName(dayInfo.dateStr, idx);
                const dateFormatted = formatDateShort(dayInfo.dateStr);

                return (
                  <div 
                    key={idx} 
                    className={`forecast-day-card card-status-${dayInfo.overallStatus} ${idx === 0 ? 'today-active-card' : ''}`}
                  >
                    {/* Header */}
                    <div className="card-top-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '0.9rem' }}>{dayName}</span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>{dateFormatted}</span>
                          {idx === 0 && <span className="today-badge">HOY</span>}
                        </div>
                        <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem', fontWeight: 500 }}>
                          <CloudSun size={12} style={{ color: '#64748b' }} />
                          {getWeatherDescription(dayInfo.weatherCode)}
                        </span>
                      </div>

                      <div className="card-temp-pill">
                        <span style={{ fontWeight: 900, color: '#f1f5f9' }}>{Math.round(dayInfo.maxTemp)}°</span>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700 }}> / {Math.round(dayInfo.minTemp)}°</span>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {/* Pulverizar */}
                      <div style={{ paddingBottom: '0.45rem', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#e2e8f0' }}>
                            <Wind size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                            Pulverizar
                          </span>
                          <span className={`status-badge badge-${dayInfo.overallStatus}`}>
                            {dayInfo.overallStatus === 'green' ? 'ÓPTIMO' : dayInfo.overallStatus === 'yellow' ? 'PRECAUCIÓN' : 'NO APTO'}
                          </span>
                        </div>
                        {dayInfo.windows.length > 0 ? (
                          <div style={{ 
                            fontSize: '0.6rem', fontWeight: 800, color: '#86efac', 
                            background: 'rgba(34,197,94,0.1)', padding: '0.3rem 0.45rem', borderRadius: '6px',
                            border: '1px solid rgba(34,197,94,0.2)'
                          }}>
                            Ventana: {dayInfo.windows.join(' | ')}
                          </div>
                        ) : (
                          <div style={{ 
                            fontSize: '0.6rem', fontWeight: 700, color: '#fca5a5', 
                            background: 'rgba(239,68,68,0.08)', padding: '0.3rem 0.45rem', borderRadius: '6px',
                            border: '1px solid rgba(239,68,68,0.15)'
                          }}>
                            {dayInfo.nonOperationalReason}
                          </div>
                        )}
                      </div>

                      {/* Siembra */}
                      <div style={{ paddingBottom: '0.4rem', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#e2e8f0' }}>
                            <Sprout size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                            Siembra
                          </span>
                          <span className={`status-badge badge-${dayInfo.sowEval.status}`}>
                            {dayInfo.sowEval.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>
                          {dayInfo.sowEval.reason}
                        </div>
                      </div>

                      {/* Cosecha */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#e2e8f0' }}>
                            <Calendar size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            Cosecha
                          </span>
                          <span className={`status-badge badge-${dayInfo.harvestEval.status}`}>
                            {dayInfo.harvestEval.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>
                          {dayInfo.harvestEval.reason}
                        </div>
                      </div>
                    </div>

                    {/* Wind Shifts */}
                    <div style={{ marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Compass size={11} style={{ color: '#22c55e' }} /> Viento
                      </div>
                      <div className="wind-shifts-grid">
                        {dayInfo.windShifts.map((shift, sIdx) => (
                          <div key={sIdx} className="wind-shift-item">
                            <span style={{ fontSize: '0.5rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{shift.period.split(' ')[0]}</span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              {shift.dir} {shift.speed}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '0.55rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem', color: '#64748b', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sunrise size={11} style={{ color: '#fcd34d', flexShrink: 0 }} /> {formatTimeHHMM(dayInfo.sunrise)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sunset size={11} style={{ color: '#fdba74', flexShrink: 0 }} /> {formatTimeHHMM(dayInfo.sunset)}
                        </span>
                      </div>
                      {dayInfo.rainSum > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#93c5fd', fontWeight: 800 }}>
                          <CloudRain size={11} /> {dayInfo.rainSum} mm
                        </span>
                      ) : (
                        <span>Sin lluvia</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Summary Card */}
              <div className="forecast-day-card summary-card-slot">
                <div className="card-top-header" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BarChart3 size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '0.9rem' }}>Resumen</span>
                  </div>
                  <span className="weather-badge">7 Días</span>
                </div>

                <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: '0.65rem', lineHeight: 1.5 }}>
                  Consolidado meteorológico para planificación en {selectedCity.name}.
                </p>

                <div className="summary-stats-grid">
                  <div className="summary-stat-box">
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>Horas Operativas</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#86efac' }}>{totalWeeklyGreenHours} hs</span>
                  </div>
                  <div className="summary-stat-box">
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>Lluvia Acumulada</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#93c5fd' }}>{totalWeeklyRainfall} mm</span>
                  </div>
                  <div className="summary-stat-box">
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>Ráfaga Máxima</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fcd34d' }}>{maxWeeklyGust} km/h</span>
                  </div>
                </div>
              </div>

              {/* BPA Card */}
              <div className="forecast-day-card summary-card-slot">
                <div className="card-top-header" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckSquare size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '0.9rem' }}>Guía BPA</span>
                  </div>
                  <span className="today-badge">BPA</span>
                </div>

                <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                  Reglas para optimizar eficiencia de agroquímicos:
                </p>

                <ul className="bpa-checklist">
                  <li>🟢 <strong>Viento óptimo:</strong> 3 a 15 km/h (evita deriva e inversión).</li>
                  <li>🟢 <strong>Delta T ideal:</strong> 2°C a 8°C (evita evaporación rápida).</li>
                  <li>🟡 <strong>Ráfagas &gt; 15 km/h:</strong> Usar pastillas antideriva.</li>
                  <li>🔴 <strong>Temp &gt; 30°C / ΔT &gt; 10°C:</strong> Suspender aplicaciones.</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#94a3b8' }}>No se pudieron cargar los datos meteorológicos.</p>
        </div>
      )}

      {/* ═══ WINDY RADAR ═══ */}
      <div className="glass-panel mb-6">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
            <Radio size={18} style={{ color: '#22c55e' }} /> Radar Meteorológico
          </h2>
          <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700 }}>{selectedCity.name}</span>
        </div>
        <div className="iframe-container">
          <iframe 
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=${selectedCity.lat}&lon=${selectedCity.lon}&detailLat=${selectedCity.lat}&detailLon=${selectedCity.lon}`}
            title="Windy Map"
          ></iframe>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="glass-panel app-footer" style={{ padding: '1.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ 
            width: '28px', height: '28px', borderRadius: '8px', 
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))',
            border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sprout size={15} style={{ color: '#22c55e' }} />
          </div>
          <span style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '1rem', letterSpacing: '-0.02em' }}>CheClima</span>
        </div>

        <p style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, maxWidth: '480px', lineHeight: 1.6 }}>
          Creado por <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>Juan Francisco Natale</strong> mediante desarrollo por inteligencia artificial en conjunto con la API de <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>granos.ar</strong>
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.55rem', color: '#64748b', fontWeight: 600 }}>
          <span style={{ background: 'rgba(30,41,59,0.5)', padding: '0.25rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.1)' }}>
            Open-Meteo API
          </span>
          <span>·</span>
          <span style={{ background: 'rgba(30,41,59,0.5)', padding: '0.25rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.1)' }}>
            Pronóstico 7 Días
          </span>
          <span>·</span>
          <span style={{ background: 'rgba(30,41,59,0.5)', padding: '0.25rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.1)' }}>
            BPA Agrícolas
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
