import React, { useState, useEffect } from 'react';
import { Wind, Droplets, MapPin, Loader2, Navigation, Thermometer, CloudRain } from 'lucide-react';
import { fetchWeather, CITIES, getWindDirectionName } from './utils/weather';
import { evaluateConditions } from './utils/rules';

function App() {
  const [cityIndex, setCityIndex] = useState(0);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const city = CITIES[cityIndex];

  useEffect(() => {
    let isMounted = true;
    const loadWeather = async () => {
      setLoading(true);
      const data = await fetchWeather(city.lat, city.lon);
      if (isMounted) {
        setWeatherData(data);
        setLoading(false);
      }
    };
    loadWeather();
    return () => { isMounted = false; };
  }, [cityIndex]);

  const current = weatherData?.current;
  const hourly = weatherData?.hourly;

  return (
    <div className="app-container">
      <h1><MapPin size={28} color="var(--primary)" /> Monitor Agropecuario</h1>

      <select 
        className="city-select" 
        value={cityIndex} 
        onChange={(e) => setCityIndex(Number(e.target.value))}
      >
        {CITIES.map((c, i) => (
          <option key={i} value={i}>{c.name}, Buenos Aires</option>
        ))}
      </select>

      {loading ? (
        <div className="flex justify-center mt-4 mb-4">
          <div className="loader"></div>
        </div>
      ) : current ? (
        <>
          {/* Weather Card */}
          <div className="glass-panel mb-6">
            <h2 className="flex items-center gap-2">
              <Thermometer size={20} /> Condiciones Actuales
            </h2>
            <div className="weather-main">
              <div className="temp-huge">{Math.round(current.temperature_2m)}°</div>
              <div className="flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Wind size={18} className="text-muted" />
                  <span className="font-medium">{current.wind_speed_10m} km/h</span>
                  <span className="text-xs text-muted">(Ráfagas: {current.wind_gusts_10m} km/h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation size={18} className="text-muted" style={{ transform: `rotate(${current.wind_direction_10m}deg)` }} />
                  <span>{getWindDirectionName(current.wind_direction_10m)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets size={18} className="text-muted" />
                  <span>{current.relative_humidity_2m}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <CloudRain size={18} className="text-muted" />
                  <span>{current.precipitation} mm</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-sm text-muted mb-2">Próximas horas</h3>
              <div className="hourly-scroll">
                {hourly?.time?.slice(0, 24).map((timeStr, idx) => {
                  const date = new Date(timeStr);
                  // Solo mostrar horas a partir de ahora (o la última disponible)
                  if (date < new Date(Date.now() - 3600000)) return null;

                  return (
                    <div key={idx} className="hourly-item">
                      <span className="text-xs font-medium">{date.getHours()}:00</span>
                      <span className="font-bold">{Math.round(hourly.temperature_2m[idx])}°</span>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted">
                        <Wind size={10} />
                        {hourly.wind_speed_10m[idx]}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <CloudRain size={10} />
                        {hourly.precipitation[idx]}mm
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agricultural Monitor */}
          <div className="glass-panel mb-6">
            <h2 className="mb-4">Semáforo de Tareas</h2>
            <div className="grid grid-cols-3 gap-4">
              {['pulverizar', 'sembrar', 'cosechar'].map((task) => {
                const rules = evaluateConditions(task, 'Soja', current);
                return (
                  <div key={task} className="state-card">
                    <div className="state-header">
                      <span className="font-bold capitalize">{task}</span>
                      <span className={`status-dot status-${rules.status}`}></span>
                    </div>
                    <p className="text-xs text-muted mt-2">{rules.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-muted">No se pudieron cargar los datos.</p>
      )}

      {/* Windy Iframe */}
      <div className="glass-panel">
        <h2 className="mb-4">Radar Windy</h2>
        <div className="iframe-container">
          <iframe 
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=6&overlay=wind&product=ecmwf&level=surface&lat=${city.lat}&lon=${city.lon}&detailLat=${city.lat}&detailLon=${city.lon}`}
            title="Windy Map"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default App;
