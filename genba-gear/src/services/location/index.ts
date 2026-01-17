/**
 * Location Service
 * GPS位置情報の取得
 */
import * as Location from 'expo-location';
import { GPSLocation } from '@/features/voice/types';

/**
 * 現在地を取得
 */
export async function getCurrentLocation(): Promise<GPSLocation | null> {
  try {
    // 権限を要求
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('位置情報の権限が許可されていません');
      return null;
    }

    // 現在地を取得（バランスモード: 精度と速度のバランス）
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('位置情報の取得に失敗:', error);
    return null;
  }
}

/**
 * 位置情報の権限状態を確認
 */
export async function checkLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * 位置情報の権限を要求
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}
