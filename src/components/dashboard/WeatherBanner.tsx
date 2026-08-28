'use client';

import { CloudRain, Wind, Thermometer, CloudLightning, Snowflake, Sun, Cloud } from 'lucide-react';
import type { WeatherData } from '@/lib/api/weather';

function weatherIcon(code: number | null, isDay: number) {
  if (code === null) return <Sun className="h-5 w-5 text-amber-400" />;
  if (code >= 95)  return <CloudLightning className="h-5 w-5 text-yellow-400" />;
  if (code >= 71)  return <Snowflake className="h-5 w-5 text-sky-300" />;
  if (code >= 51)  return <CloudRain className="h-5 w-5 text-sky-400" />;
  if (code >= 3)   return <Cloud className="h-5 w-5 text-text-2" />;
  return isDay ? <Sun className="h-5 w-5 text-amber-400" /> : <Cloud className="h-5 w-5 text-text-2" />;
}

function alertBadge(weather: WeatherData): { text: string; color: string } | null {
  const code = weather.weather_code ?? 0;
  const wind = weather.wind_speed ?? 0;
  const temp = weather.temperature ?? 20;
  const rain = weather.rain_prob_day ?? 0;

  if (code >= 95) return { text: 'Temporale in corso', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
  if (code >= 71) return { text: 'Nevicate in atto', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
  if (code >= 51) return { text: 'Pioggia in corso', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  if (wind >= 40) return { text: `Vento forte ${Math.round(wind)} km/h`, color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
  if (temp >= 35) return { text: `Caldo estremo ${Math.round(temp)}°C`, color: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (temp <= 0)  return { text: `Temperatura sotto zero ${Math.round(temp)}°C`, color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
  if (rain >= 60) return { text: `Alta probabilità pioggia ${rain}%`, color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
  return null;
}

export default function WeatherBanner({ weather }: { weather: WeatherData }) {
  const alert = alertBadge(weather);

  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-surface px-4 py-3">
      {/* Icona meteo */}
      <div className="shrink-0">
        {weatherIcon(weather.weather_code, weather.is_day)}
      </div>

      {/* Città + condizione */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-semibold text-text">
            {weather.temperature !== null ? `${Math.round(weather.temperature)}°C` : '—'}
          </span>
          {weather.city && (
            <span className="text-xs text-text-2 truncate">{weather.city}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {weather.condition && (
            <span className="text-xs text-text-2">{weather.condition}</span>
          )}
          {weather.temp_max !== null && weather.temp_min !== null && (
            <span className="text-xs text-text-2">
              ↑{Math.round(weather.temp_max)}° ↓{Math.round(weather.temp_min)}°
            </span>
          )}
          {weather.rain_prob_day !== null && weather.rain_prob_day > 0 && (
            <span className="flex items-center gap-1 text-xs text-sky-400">
              <CloudRain className="h-3 w-3" />
              {weather.rain_prob_day}%
            </span>
          )}
          {weather.wind_speed !== null && weather.wind_speed > 0 && (
            <span className="flex items-center gap-1 text-xs text-text-2">
              <Wind className="h-3 w-3" />
              {Math.round(weather.wind_speed)} km/h
            </span>
          )}
        </div>
      </div>

      {/* Badge allerta se presente */}
      {alert && (
        <div className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${alert.color}`}>
          {alert.text}
        </div>
      )}
    </div>
  );
}
