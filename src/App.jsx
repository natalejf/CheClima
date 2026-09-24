import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, Droplets, MapPin, Navigation, Thermometer, 
  CloudRain, Calendar, Clock, Search, X, Sprout, ShieldAlert,
  Gauge, AlertTriangle, Truck, Snowflake, Sunrise, Sunset,
  Sun, Moon, Award, CheckCircle2, XCircle, AlertCircle, Play,
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY); // Default Necochea
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plannerFilter, setPlannerFilter] = useState('todos');
  const [heroTask, setHeroTask] = useState('fumigar');

  const searchContainerRef = useRef(null);

  // Toggle dark/light theme on body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [isDarkMode]);

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

  // Compute immediate status for all tasks
  const currentSprayEval = current ? evaluateConditions('fumigar', current) : null;
  const currentSowEval = current ? evaluateConditions('sembrar', current) : null;
  const currentHarvestEval = current ? evaluateConditions('cosechar', current) : null;

  const bestDayFumigar = weeklyAnalysis?.bestDayFumigar;
  const bestDaySembrar = weeklyAnalysis?.bestDaySembrar;
  const bestDayCosechar = weeklyAnalysis?.bestDayCosechar;

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

  const getBestWeeklyTimesForTask = (weeklyAnalysis, filter) => {
    if (!weeklyAnalysis?.days) return [];
    
    return weeklyAnalysis.days.map((dayInfo, idx) => {
      const dayName = getDayName(dayInfo.dateStr, idx);
      const isFumig = filter === 'fumigar' || filter === 'pulverizar';
      const isSow = filter === 'sembrar';
      const isHarvest = filter === 'cosechar';

      if (isFumig) {
        if (dayInfo.windows?.length > 0) {
          return { dayName, windows: dayInfo.windows.join(' | '), status: dayInfo.overallStatus };
        }
      } else if (isSow) {
        if (dayInfo.sowEval?.windows?.length > 0 && dayInfo.sowEval.status !== 'red') {
          return { dayName, windows: dayInfo.sowEval.windows.join(' | '), status: dayInfo.sowEval.status };
        } else if (dayInfo.sowEval?.status !== 'red') {
          return { dayName, windows: 'Horarios diurnos (Temp > 10°C)', status: dayInfo.sowEval.status };
        }
      } else if (isHarvest) {
        if (dayInfo.harvestEval?.windows?.length > 0 && dayInfo.harvestEval.status !== 'red') {
          return { dayName, windows: dayInfo.harvestEval.windows.join(' | '), status: dayInfo.harvestEval.status };
        } else if (dayInfo.harvestEval?.status !== 'red') {
          return { dayName, windows: '12:00 a 18:00 hs (Menor humedad)', status: dayInfo.harvestEval.status };
        }
      }
      return null;
    }).filter(Boolean);
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
        
        {/* Theme Toggle Button */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <div style={{ 
            width: '38px', height: '38px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.15))', 
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sprout size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h1 className="brand-title" style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
            CheClima
          </h1>
          <span style={{ 
            fontSize: '0.55rem', fontWeight: 800, background: 'var(--green-bg)', 
            color: 'var(--green)', padding: '0.15rem 0.5rem', borderRadius: '99px', 
            border: '1px solid rgba(34, 197, 94, 0.3)', letterSpacing: '0.05em', textTransform: 'uppercase'
          }}>
            MONITOR
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1.15rem', letterSpacing: '0.01em' }}>
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
                <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Buscando localidades...</div>
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
                    <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
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
          fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)'
        }}>
          <MapPin size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span>{selectedCity.name}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {[selectedCity.admin1, selectedCity.country].filter(Boolean).join(', ')}
          </span>
          <span style={{ 
            width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', 
            boxShadow: '0 0 6px rgba(34,197,94,0.5)', display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            LIVE
          </span>
        </div>
      </header>

      {loading ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
          <div className="loader" style={{ marginBottom: '1rem' }}></div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Calculando ventanas aptas...</p>
          <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.72rem', marginTop: '0.25rem' }}>Conectando con modelos meteorológicos para {selectedCity.name}</p>
        </div>
      ) : current ? (
        <>
          {/* ═══ HERO PANORAMA ═══ */}
          <div className="glass-panel hero-panorama-card mb-6">
            {/* Top Row: Title + Task Selector + Status Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <Activity size={14} style={{ color: 'var(--green)' }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--green)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Panorama de Campo</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{getFormattedTodayDate()}</span>
                  </div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-white)', lineHeight: 1.3 }}>
                    {selectedCity.name}: ¿Conviene realizar labores hoy?
                  </h2>
                </div>

                {/* Labor Tabs for Panorama */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'fumigar', label: 'Fumigar', icon: Wind, eval: currentSprayEval },
                    { id: 'sembrar', label: 'Sembrar', icon: Sprout, eval: currentSowEval },
                    { id: 'cosechar', label: 'Cosechar', icon: Calendar, eval: currentHarvestEval }
                  ].map((task) => {
                    const TaskIcon = task.icon;
                    const isActive = heroTask === task.id;
                    const status = task.eval?.status || 'yellow';
                    return (
                      <button
                        key={task.id}
                        onClick={() => setHeroTask(task.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          border: isActive ? `1.5px solid var(--${status === 'green' ? 'green' : status === 'yellow' ? 'yellow' : 'red'})` : '1px solid rgba(148,163,184,0.15)',
                          background: isActive ? `var(--${status === 'green' ? 'green' : status === 'yellow' ? 'yellow' : 'red'}-bg)` : 'var(--bg-card-solid)',
                          color: 'var(--text-white)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <TaskIcon size={12} style={{ color: `var(--${status === 'green' ? 'green' : status === 'yellow' ? 'yellow' : 'red'})` }} />
                        {task.label}: {status === 'green' ? '🟢 APTO' : status === 'yellow' ? '🟡 PRECAUCIÓN' : '🔴 NO APTO'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3 Panorama Cards for Selected Task */}
            <div className="hero-three-cards-grid">
              {/* Ventana Horaria */}
              <div className="panorama-box green-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <Play size={13} style={{ color: 'var(--green)' }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--green)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ventana Apta</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)' }}>
                  {heroTask === 'fumigar' && (todayAnalysis?.windows?.length > 0 ? todayAnalysis.windows.join(' | ') : 'Sin ventana óptima')}
                  {heroTask === 'sembrar' && (todayAnalysis?.sowEval?.windows?.length > 0 ? todayAnalysis.sowEval.windows.join(' | ') : (todayAnalysis?.sowEval?.status !== 'red' ? 'Horario diurno (Temp > 10°C)' : 'Sin ventana apta'))}
                  {heroTask === 'cosechar' && (todayAnalysis?.harvestEval?.windows?.length > 0 ? todayAnalysis.harvestEval.windows.join(' | ') : (todayAnalysis?.harvestEval?.status !== 'red' ? '12:00 a 18:00 hs' : 'Sin ventana apta'))}
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>
                  Horario apto para {heroTask === 'fumigar' ? 'fumigar/pulverizar' : heroTask === 'sembrar' ? 'siembra' : 'cosecha'}
                </span>
              </div>

              {/* Diagnóstico */}
              <div className="panorama-box amber-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <ShieldAlert size={13} style={{ color: 'var(--yellow)' }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--yellow)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diagnóstico</span>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {heroTask === 'fumigar' && currentSprayEval?.message}
                  {heroTask === 'sembrar' && currentSowEval?.message}
                  {heroTask === 'cosechar' && currentHarvestEval?.message}
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>
                  Viento: {current.wind_speed_10m} km/h • Temp: {current.temperature_2m}°C • Humedad: {current.relative_humidity_2m}%
                </span>
              </div>

              {/* Sol */}
              <div className="panorama-box blue-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <Sun size={13} style={{ color: 'var(--blue)' }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Luz Solar</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sunrise size={14} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatTimeHHMM(todayAnalysis?.sunrise)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sunset size={14} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatTimeHHMM(todayAnalysis?.sunset)}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.35rem', fontWeight: 500 }}>
                  Duración: <strong style={{ color: 'var(--text-primary)' }}>{calculateDaylightDuration(todayAnalysis?.sunrise, todayAnalysis?.sunset)}</strong>
                </span>
              </div>
            </div>

            {/* Best Day Banner for Selected Task */}
            {weeklyAnalysis && (
              <div className="best-day-banner-prominent" style={{ marginTop: '1rem' }}>
                <div className="best-day-icon-circle">
                  <Award size={28} style={{ color: 'var(--yellow)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--yellow)',
                      background: 'var(--yellow-bg)', padding: '0.15rem 0.55rem', borderRadius: '99px',
                      border: '1px solid rgba(245,158,11,0.3)', letterSpacing: '0.04em'
                    }}>
                      🏆 Mejor día para {heroTask === 'fumigar' ? 'Fumigar' : heroTask === 'sembrar' ? 'Sembrar' : 'Cosechar'}
                    </span>
                  </div>
                  {heroTask === 'fumigar' && bestDayFumigar && (
                    <>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-white)', marginTop: '0.3rem' }}>
                        {getDayName(bestDayFumigar.dateStr, bestDayFumigar.dayIndex)} ({formatDateShort(bestDayFumigar.dateStr)}) — <span style={{ color: 'var(--green)' }}>{bestDayFumigar.greenCount} hs óptimas</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.15rem' }}>
                        {bestDayFumigar.windows.length > 0 ? `Ventanas: ${bestDayFumigar.windows.join(' y ')}.` : 'Menor viento y lluvias.'} Viento máx: {bestDayFumigar.maxWind} km/h
                      </div>
                    </>
                  )}
                  {heroTask === 'sembrar' && bestDaySembrar && (
                    <>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-white)', marginTop: '0.3rem' }}>
                        {getDayName(bestDaySembrar.dateStr, bestDaySembrar.dayIndex)} ({formatDateShort(bestDaySembrar.dateStr)}) — <span style={{ color: bestDaySembrar.sowEval.status === 'green' ? 'var(--green)' : 'var(--yellow)' }}>{bestDaySembrar.sowEval.label}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.15rem' }}>
                        {bestDaySembrar.sowEval.reason} • Temp Mín: {Math.round(bestDaySembrar.minTemp)}°C • Lluvia: {bestDaySembrar.rainSum} mm
                      </div>
                    </>
                  )}
                  {heroTask === 'cosechar' && bestDayCosechar && (
                    <>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-white)', marginTop: '0.3rem' }}>
                        {getDayName(bestDayCosechar.dateStr, bestDayCosechar.dayIndex)} ({formatDateShort(bestDayCosechar.dateStr)}) — <span style={{ color: bestDayCosechar.harvestEval.status === 'green' ? 'var(--green)' : 'var(--yellow)' }}>{bestDayCosechar.harvestEval.label}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.15rem' }}>
                        {bestDayCosechar.harvestEval.reason} • Lluvia: {bestDayCosechar.rainSum} mm • Viento máx: {bestDayCosechar.maxWind} km/h
                      </div>
                    </>
                  )}
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
                  <Thermometer size={18} style={{ color: 'var(--green)' }} /> Clima Actual
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
                      <Wind size={16} style={{ color: 'var(--green)' }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Viento</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-white)' }}>
                      {current.wind_speed_10m} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>km/h</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Ráfagas: <strong style={{ color: 'var(--text-primary)' }}>{current.wind_gusts_10m} km/h</strong>
                    </div>
                    <div className="wind-direction-pill" style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Navigation 
                        size={12} 
                        style={{ transform: `rotate(${current.wind_direction_10m}deg)`, color: 'var(--green)', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '0.65rem' }}>{getWindDirectionName(current.wind_direction_10m)}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>({current.wind_direction_10m}°)</span>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="metric-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <Droplets size={16} style={{ color: 'var(--blue)' }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Humedad</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-white)' }}>{current.relative_humidity_2m}%</div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Humedad relativa</span>
                  </div>

                  {/* Precipitation */}
                  <div className="metric-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <CloudRain size={16} style={{ color: 'var(--blue)' }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lluvia</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-white)' }}>{current.precipitation} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>mm</span></div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Precipitación actual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Semaphore */}
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <ShieldAlert size={18} style={{ color: 'var(--green)' }} /> Semáforo de Labores
                </h2>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>Evaluación en tiempo real</span>
              </div>

              <div className="tasks-grid">
                {['fumigar', 'pulverizar', 'sembrar', 'cosechar'].map((task) => {
                  const rules = evaluateConditions(task, current);
                  return (
                    <div key={task} className={`state-card state-border-${rules.status}`}>
                      <div className="state-header">
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', textTransform: 'capitalize' }}>
                          {(task === 'fumigar' || task === 'pulverizar') && <Wind size={15} style={{ color: 'var(--green)' }} />}
                          {task === 'sembrar' && <Sprout size={15} style={{ color: 'var(--accent-secondary)' }} />}
                          {task === 'cosechar' && <Calendar size={15} style={{ color: 'var(--yellow)' }} />}
                          {task}
                        </span>
                        <span className={`status-badge badge-${rules.status}`}>
                          {rules.status === 'green' ? 'APTO' : rules.status === 'yellow' ? 'PRECAUCIÓN' : 'NO APTO'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.5 }}>{rules.message}</p>
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
                <Gauge size={18} style={{ color: 'var(--green)' }} /> Monitores de Aplicación
              </h2>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, display: 'none' }} className="sm:inline">Delta T · Inversión · Piso · Heladas</span>
            </div>

            <div className="insights-grid">
              {/* Delta T */}
              {deltaT && (
                <div className={`insight-card insight-border-${deltaT.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Gauge size={16} style={{ color: 'var(--green)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.78rem' }}>Delta T</span>
                    </div>
                    <span className={`status-badge badge-${deltaT.status}`}>
                      {deltaT.deltaT} °C
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>Zona: {deltaT.zone}</div>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{deltaT.advice}</p>
                </div>
              )}

              {/* Thermal Inversion */}
              {thermalInversion && (
                <div className={`insight-card insight-border-${thermalInversion.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={16} style={{ color: 'var(--yellow)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.78rem' }}>Inversión Térmica</span>
                    </div>
                    <span className={`status-badge badge-${thermalInversion.status}`}>
                      {thermalInversion.status === 'green' ? 'BAJO' : thermalInversion.status === 'yellow' ? 'MODERADO' : 'ALTO'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{thermalInversion.title}</div>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{thermalInversion.advice}</p>
                </div>
              )}

              {/* Soil */}
              {soilTraffic && (
                <div className={`insight-card insight-border-${soilTraffic.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Truck size={16} style={{ color: 'var(--blue)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.78rem' }}>Piso en Lote</span>
                    </div>
                    <span className={`status-badge badge-${soilTraffic.status}`}>
                      {soilTraffic.status === 'green' ? 'TRANSITABLE' : soilTraffic.status === 'yellow' ? 'PRECAUCIÓN' : 'BARRO'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{soilTraffic.title}</div>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{soilTraffic.advice}</p>
                </div>
              )}

              {/* Frost */}
              {frostRisk && (
                <div className={`insight-card insight-border-${frostRisk.status}`}>
                  <div className="insight-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Snowflake size={16} style={{ color: 'var(--blue)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.78rem' }}>Heladas</span>
                    </div>
                    <span className={`status-badge badge-${frostRisk.status}`}>
                      {frostRisk.status === 'green' ? 'SIN RIESGO' : frostRisk.status === 'yellow' ? 'ALERTA' : 'HELADA'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{frostRisk.title}</div>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{frostRisk.advice}</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══ PLANIFICADOR SEMANAL ═══ */}
          <div className="glass-panel mb-6">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Calendar size={18} style={{ color: 'var(--green)' }} /> Planificador Semanal
                  </h2>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Seleccioná una labor para filtrar los mejores horarios de la semana de forma rápida
                  </p>
                </div>
                <span style={{ 
                  fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-secondary)', 
                  background: 'var(--bg-elevated)', padding: '0.3rem 0.65rem', borderRadius: '99px',
                  border: '1px solid rgba(148,163,184,0.12)'
                }}>
                  {selectedCity.name} · 7 Días
                </span>
              </div>

              {/* Task Filters */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { id: 'todos', label: 'Todas las labores', icon: Calendar },
                  { id: 'fumigar', label: 'Fumigar', icon: Wind },
                  { id: 'pulverizar', label: 'Pulverizar', icon: Wind },
                  { id: 'sembrar', label: 'Sembrar', icon: Sprout },
                  { id: 'cosechar', label: 'Cosechar', icon: Calendar }
                ].map((item) => {
                  const IconComponent = item.icon;
                  const isActive = plannerFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPlannerFilter(item.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '99px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        border: isActive ? '1px solid var(--green)' : '1px solid rgba(148,163,184,0.15)',
                        background: isActive ? 'var(--green-bg)' : 'var(--bg-elevated)',
                        color: isActive ? 'var(--green)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <IconComponent size={13} style={{ color: isActive ? 'var(--green)' : 'var(--text-muted)' }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Summary Banner for Task Filter */}
              {plannerFilter !== 'todos' && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--green)' }}>
                    <CheckCircle2 size={15} />
                    <span>Mejores Horarios Semanales para {plannerFilter.charAt(0).toUpperCase() + plannerFilter.slice(1)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {getBestWeeklyTimesForTask(weeklyAnalysis, plannerFilter).length > 0 ? (
                      getBestWeeklyTimesForTask(weeklyAnalysis, plannerFilter).map((item, i) => (
                        <div key={i} style={{
                          fontSize: '0.64rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          background: 'var(--bg-card-solid)',
                          border: item.status === 'green' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          color: 'var(--text-primary)',
                          fontWeight: 600
                        }}>
                          <strong style={{ color: 'var(--text-white)' }}>{item.dayName}:</strong> {item.windows}
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        Sin ventanas óptimas registradas para esta tarea en los próximos 7 días.
                      </span>
                    )}
                  </div>
                </div>
              )}
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
                          <span style={{ fontWeight: 900, color: 'var(--text-white)', fontSize: '0.9rem' }}>{dayName}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{dateFormatted}</span>
                          {idx === 0 && <span className="today-badge">HOY</span>}
                        </div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem', fontWeight: 500 }}>
                          <CloudSun size={12} style={{ color: 'var(--text-muted)' }} />
                          {getWeatherDescription(dayInfo.weatherCode)}
                        </span>
                      </div>

                      <div className="card-temp-pill">
                        <span style={{ fontWeight: 900, color: 'var(--text-white)' }}>{Math.round(dayInfo.maxTemp)}°</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}> / {Math.round(dayInfo.minTemp)}°</span>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {/* Fumigar / Pulverizar */}
                      {(plannerFilter === 'todos' || plannerFilter === 'fumigar' || plannerFilter === 'pulverizar') && (
                        <div style={{ paddingBottom: '0.45rem', borderBottom: plannerFilter === 'todos' ? '1px solid rgba(148,163,184,0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                              <Wind size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
                              {plannerFilter === 'pulverizar' ? 'Pulverizar' : 'Fumigar / Pulverizar'}
                            </span>
                            <span className={`status-badge badge-${dayInfo.overallStatus}`}>
                              {dayInfo.overallStatus === 'green' ? 'ÓPTIMO' : dayInfo.overallStatus === 'yellow' ? 'PRECAUCIÓN' : 'NO APTO'}
                            </span>
                          </div>
                          {dayInfo.windows.length > 0 ? (
                            <div style={{ 
                              fontSize: '0.6rem', fontWeight: 800, color: 'var(--green)', 
                              background: 'var(--green-bg)', padding: '0.3rem 0.45rem', borderRadius: '6px',
                              border: '1px solid rgba(34,197,94,0.2)'
                            }}>
                              Ventana: {dayInfo.windows.join(' | ')}
                            </div>
                          ) : (
                            <div style={{ 
                              fontSize: '0.6rem', fontWeight: 700, color: 'var(--red)', 
                              background: 'var(--red-bg)', padding: '0.3rem 0.45rem', borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.15)'
                            }}>
                              {dayInfo.nonOperationalReason}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Siembra */}
                      {(plannerFilter === 'todos' || plannerFilter === 'sembrar') && (
                        <div style={{ paddingBottom: '0.4rem', borderBottom: plannerFilter === 'todos' ? '1px solid rgba(148,163,184,0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                              <Sprout size={12} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                              Siembra
                            </span>
                            <span className={`status-badge badge-${dayInfo.sowEval.status}`}>
                              {dayInfo.sowEval.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.2rem' }}>
                            {dayInfo.sowEval.reason}
                          </div>
                          {plannerFilter === 'sembrar' && (
                            <div style={{ 
                              fontSize: '0.6rem', fontWeight: 800, color: dayInfo.sowEval.status === 'green' ? 'var(--green)' : 'var(--yellow)', 
                              background: dayInfo.sowEval.status === 'green' ? 'var(--green-bg)' : 'var(--yellow-bg)', 
                              padding: '0.25rem 0.45rem', borderRadius: '6px', marginTop: '0.2rem'
                            }}>
                              Mejores horas: {dayInfo.sowEval.windows?.length > 0 ? dayInfo.sowEval.windows.join(' | ') : (dayInfo.sowEval.status !== 'red' ? 'Diurno (Temp > 10°C)' : 'Sin ventana apta')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cosecha */}
                      {(plannerFilter === 'todos' || plannerFilter === 'cosechar') && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                              <Calendar size={12} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                              Cosecha
                            </span>
                            <span className={`status-badge badge-${dayInfo.harvestEval.status}`}>
                              {dayInfo.harvestEval.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.2rem' }}>
                            {dayInfo.harvestEval.reason}
                          </div>
                          {plannerFilter === 'cosechar' && (
                            <div style={{ 
                              fontSize: '0.6rem', fontWeight: 800, color: dayInfo.harvestEval.status === 'green' ? 'var(--green)' : 'var(--yellow)', 
                              background: dayInfo.harvestEval.status === 'green' ? 'var(--green-bg)' : 'var(--yellow-bg)', 
                              padding: '0.25rem 0.45rem', borderRadius: '6px', marginTop: '0.2rem'
                            }}>
                              Mejores horas: {dayInfo.harvestEval.windows?.length > 0 ? dayInfo.harvestEval.windows.join(' | ') : (dayInfo.harvestEval.status !== 'red' ? '12:00 a 18:00 hs' : 'Sin ventana apta')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Wind Shifts */}
                    <div style={{ marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Compass size={11} style={{ color: 'var(--green)' }} /> Viento
                      </div>
                      <div className="wind-shifts-grid">
                        {dayInfo.windShifts.map((shift, sIdx) => (
                          <div key={sIdx} className="wind-shift-item">
                            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{shift.period.split(' ')[0]}</span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              {shift.dir} {shift.speed}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '0.55rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sunrise size={11} style={{ color: 'var(--yellow)', flexShrink: 0 }} /> {formatTimeHHMM(dayInfo.sunrise)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sunset size={11} style={{ color: 'var(--yellow)', flexShrink: 0 }} /> {formatTimeHHMM(dayInfo.sunset)}
                        </span>
                      </div>
                      {dayInfo.rainSum > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--blue)', fontWeight: 800 }}>
                          <CloudRain size={11} /> {dayInfo.rainSum} mm {dayInfo.rainSchedule ? `(${dayInfo.rainSchedule})` : ''}
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
                    <BarChart3 size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 900, color: 'var(--text-white)', fontSize: '0.9rem' }}>Resumen</span>
                  </div>
                  <span className="weather-badge">7 Días</span>
                </div>

                <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.5 }}>
                  Consolidado meteorológico para planificación en {selectedCity.name}.
                </p>

                <div className="summary-stats-grid">
                  <div className="summary-stat-box">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Horas Aptas</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--green)' }}>{totalWeeklyGreenHours} hs</span>
                  </div>
                  <div className="summary-stat-box">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Lluvia Acumulada</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--blue)' }}>{totalWeeklyRainfall} mm</span>
                  </div>
                  <div className="summary-stat-box">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Ráfaga Máxima</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--yellow)' }}>{maxWeeklyGust} km/h</span>
                  </div>
                </div>
              </div>

              {/* BPA Card */}
              <div className="forecast-day-card summary-card-slot">
                <div className="card-top-header" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckSquare size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 900, color: 'var(--text-white)', fontSize: '0.9rem' }}>Guía BPA</span>
                  </div>
                  <span className="today-badge">BPA</span>
                </div>

                <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
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
          <p style={{ color: 'var(--text-secondary)' }}>No se pudieron cargar los datos meteorológicos.</p>
        </div>
      )}

      {/* ═══ WINDY RADAR ═══ */}
      <div className="glass-panel mb-6">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
            <Radio size={18} style={{ color: 'var(--green)' }} /> Radar Meteorológico
          </h2>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700 }}>{selectedCity.name}</span>
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
            <Sprout size={15} style={{ color: 'var(--green)' }} />
          </div>
          <span style={{ fontWeight: 900, color: 'var(--text-white)', fontSize: '1rem', letterSpacing: '-0.02em' }}>CheClima</span>
        </div>

        <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 500, maxWidth: '480px', lineHeight: 1.6 }}>
          Creado por <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Juan Francisco Natale</strong> mediante desarrollo por inteligencia artificial en conjunto con la API de <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>granos.ar</strong>
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <span style={{ background: 'var(--bg-elevated)', padding: '0.25rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.1)' }}>
            Open-Meteo API
          </span>
          <span>·</span>
          <span style={{ background: 'var(--bg-elevated)', padding: '0.25rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.1)' }}>
            Pronóstico 7 Días
          </span>
          <span>·</span>
          <span style={{ background: 'var(--bg-elevated)', padding: '0.25rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.1)' }}>
            BPA Agrícolas
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
