'use client';

import { fetchAPI } from './client';

export type WeatherData = {
  city:          string | null;
  temperature:   number | null;
  feels_like:    number | null;
  humidity:      number | null;
  weather_code:  number | null;
  condition:     string | null;
  wind_speed:    number | null;
  wind_gusts:    number | null;
  rain_prob:     number | null;
  is_day:        number;
  temp_max:      number | null;
  temp_min:      number | null;
  sunrise:       string | null;
  sunset:        string | null;
  rain_prob_day: number | null;
  updated_at:    string | null;
  source:        string;
  attribution:   string;
};

export async function getWeatherData(projectId: string): Promise<WeatherData | null> {
  try {
    const data = await fetchAPI<{ ok: boolean; weather?: WeatherData; reason?: string }>(
      `/api/hub/weather?project_id=${encodeURIComponent(projectId)}`,
    );
    return data.ok && data.weather ? data.weather : null;
  } catch {
    return null;
  }
}

export async function patchProjectLocation(
  projectId: string,
  latitude: number,
  longitude: number,
  city: string,
): Promise<void> {
  await fetchAPI(`/api/hub/projects/${encodeURIComponent(projectId)}/location`, {
    method: 'PATCH',
    body:   JSON.stringify({ latitude, longitude, city }),
  });
}
