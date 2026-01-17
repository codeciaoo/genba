/**
 * Weather Service
 * 天気情報の取得（OpenWeatherMap API）
 */
import { WeatherData } from '@/features/voice/types';

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

/**
 * 座標から天気情報を取得
 */
export async function getWeather(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  if (!WEATHER_API_KEY) {
    console.warn('EXPO_PUBLIC_WEATHER_API_KEY が設定されていません');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
    );

    if (!response.ok) {
      console.error('天気APIエラー:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      description: data.weather[0]?.description || '不明',
      temperature: Math.round(data.main?.temp ?? 0),
      humidity: data.main?.humidity ?? 0,
    };
  } catch (error) {
    console.error('天気情報の取得に失敗:', error);
    return null;
  }
}

/**
 * 天気情報を日本語で整形
 */
export function formatWeatherDescription(weather: WeatherData): string {
  return `${weather.description}（${weather.temperature}℃）`;
}
