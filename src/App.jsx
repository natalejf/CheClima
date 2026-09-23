import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, Droplets, MapPin, Navigation, Thermometer, 
  CloudRain, Calendar, Clock, Search, X, Sprout, ShieldAlert,
  Gauge, AlertTriangle, Truck, Snowflake, Info
} from 'lucide-react';
import { 
  fetchWeather, searchCities, POPULAR_CITIES, 
  getWindDirectionName, getWeatherDescription 
} from './utils/weather';
import { 
  evaluateConditions, calculateDeltaT, 
  evaluateThermalInversion, evaluateSoilTrafficability, 
  evaluateFrostRisk 
} from './utils/rules';

function App() {
  const [selectedCity, setSelectedCity] = useState(POPULAR_CITIES[0]); // Default Pergamino
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('Soja');

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

  // Compute operational insights
  const deltaT = current ? calculateDeltaT(current.temperature_2m, current.relative_humidity_2m) : null;
  const thermalInversion = current ? evaluateThermalInversion(current.wind_speed_10m, current.cloud_cover) : null;
  const soilTraffic = current ? evaluateSoilTrafficability(current.precipitation, current.relative_humidity_2m) : null;
  const frostRisk = current ? evaluateFrostRisk(current.temperature_2m, daily?.temperature_2m_min[0]) : null;

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
              <p className="text-xs text-muted">Monitor climático y operativo para el campo</p>
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
          <div className="popular-cities flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
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
          <p className="text-muted text-sm">Obteniendo datos meteorológicos de alta precisión...</p>
        </div>
      ) : current ? (
        <>
          {/* Main Top Grid: Current Conditions + Task Semaphore */}
          <div className="main-grid mb-6">
            {/* Current Weather Card */}
            <div className="glass-panel weather-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <Thermometer size={20} color="var(--primary-hover)" /> Clima Actual
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
                    <div className="text-xs text-muted mt-1 flex items-center gap-1">
                      <span>Ráfagas:</span>
                      <strong className="text-white">{current.wind_gusts_10m} km/h</strong>
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

            {/* Agricultural Task Monitor */}
            <div className="glass-panel tasks-card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-base md:text-lg">
                  <ShieldAlert size={20} color="var(--primary-hover)" /> Semáforo de Tareas
                </h2>
                {/* Crop Selector */}
                <div className="crop-selector flex items-center gap-1">
                  <span className="text-xs text-muted font-medium">Grano:</span>
                  <select 
                    value={selectedCrop} 
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="crop-select"
                  >
                    <option value="Soja">Soja</option>
                    <option value="Maíz">Maíz</option>
                    <option value="Trigo">Trigo</option>
                    <option value="Girasol">Girasol</option>
                  </select>
                </div>
              </div>

              <div className="tasks-grid">
                {['pulverizar', 'sembrar', 'cosechar'].map((task) => {
                  const rules = evaluateConditions(task, selectedCrop, current);
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

          {/* NEW SECTION: Advanced Agronomic Insights / Operational Monitors */}
          <div className="glass-panel mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg">
                <Gauge size={20} color="var(--primary-hover)" /> Monitores e Insights Agronómicos
              </h2>
              <span className="text-xs text-muted hidden sm:inline">Indicadores para decisión en lote</span>
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

          {/* Extended Daily Forecast (7 Días) */}
          <div className="glass-panel mb-6">
            <h2 className="flex items-center gap-2 text-base md:text-lg mb-4">
              <Calendar size={20} color="var(--primary-hover)" /> Pronóstico Extendido por Días (7 Días)
            </h2>
            <div className="daily-grid">
              {daily?.time?.map((dateStr, idx) => {
                const dayName = getDayName(dateStr, idx);
                const dateFormatted = formatDateShort(dateStr);
                const maxTemp = Math.round(daily.temperature_2m_max[idx]);
                const minTemp = Math.round(daily.temperature_2m_min[idx]);
                const rainSum = daily.precipitation_sum[idx];
                const rainProb = daily.precipitation_probability_max[idx];
                const maxWind = Math.round(daily.wind_speed_10m_max[idx]);
                const maxGust = Math.round(daily.wind_gusts_10m_max[idx]);
                const code = daily.weather_code[idx];

                return (
                  <div key={idx} className={`daily-card ${idx === 0 ? 'today-highlight' : ''}`}>
                    <div className="daily-header">
                      <span className="font-bold text-white">{dayName}</span>
                      <span className="text-xs text-muted">{dateFormatted}</span>
                    </div>

                    <div className="daily-desc text-xs text-muted my-1">
                      {getWeatherDescription(code)}
                    </div>

                    <div className="daily-temps my-2">
                      <span className="temp-max font-bold text-white">{maxTemp}°</span>
                      <span className="temp-divider">/</span>
                      <span className="temp-min text-muted">{minTemp}°</span>
                    </div>

                    <div className="daily-info-list">
                      <div className="daily-info-item text-xs">
                        <CloudRain size={12} className="text-muted shrink-0" />
                        <span>{rainSum} mm</span>
                        {rainProb > 0 && <span className="text-xs text-muted">({rainProb}%)</span>}
                      </div>

                      <div className="daily-info-item text-xs">
                        <Wind size={12} className="text-muted shrink-0" />
                        <span>{maxWind} km/h</span>
                        <span className="text-xs text-muted">(Ráf: {maxGust})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extended Hourly Forecast (Hora por Hora) */}
          <div className="glass-panel mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="flex items-center gap-2 text-base md:text-lg">
                <Clock size={20} color="var(--primary-hover)" /> Pronóstico Detallado Hora por Hora (48 Horas)
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

                return (
                  <div key={idx} className={`hourly-item-extended ${isNow ? 'is-now' : ''}`}>
                    <span className="text-xs text-muted uppercase font-semibold">{dayStr}</span>
                    <span className="text-sm font-bold text-white">{hours}:00</span>
                    
                    <span className="hourly-temp font-extrabold text-white mt-1">
                      {Math.round(hourly.temperature_2m[idx])}°
                    </span>

                    <div className="hourly-stat mt-2">
                      <Wind size={12} className="text-muted shrink-0" />
                      <span className="font-medium text-xs text-white">{hourly.wind_speed_10m[idx]} km/h</span>
                      <span className="text-[10px] text-muted">Ráf: {hourly.wind_gusts_10m[idx]}</span>
                    </div>

                    <div className="hourly-dir flex items-center gap-1 text-[11px] text-muted">
                      <Navigation size={10} style={{ transform: `rotate(${hourly.wind_direction_10m[idx]}deg)` }} className="shrink-0" />
                      <span>{dirName}</span>
                    </div>

                    <div className="hourly-stat mt-1">
                      <CloudRain size={12} className="text-muted shrink-0" />
                      <span className="text-xs text-white">{hourly.precipitation[idx]} mm</span>
                      {hourly.precipitation_probability[idx] > 0 && (
                        <span className="text-[10px] text-muted">({hourly.precipitation_probability[idx]}%)</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
