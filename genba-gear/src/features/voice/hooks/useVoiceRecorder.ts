/**
 * useVoiceRecorder Hook
 * 音声録音のロジックをカプセル化
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { RECORDING_CONFIG } from '../types';

interface UseVoiceRecorderOptions {
  onRecordingComplete?: (uri: string, duration: number) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  duration: number;
  progress: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const { onRecordingComplete, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // プログレス計算 (0-1)
  const progress = duration / (RECORDING_CONFIG.MAX_DURATION_MS / 1000);

  // タイマーのクリーンアップ
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 録音のクリーンアップ
  const cleanupRecording = useCallback(async () => {
    clearTimer();
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // 既に停止している場合は無視
      }
      recordingRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
  }, [clearTimer]);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // 録音開始
  const startRecording = useCallback(async () => {
    try {
      // マイク権限を要求
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('権限エラー', 'マイクの使用を許可してください');
        return;
      }

      // オーディオモードを設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 録音を開始
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      // タイマーを開始（秒単位でカウント）
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // 最大時間に達したら自動停止
        if (elapsed >= RECORDING_CONFIG.MAX_DURATION_MS / 1000) {
          stopRecording();
        }
      }, 100);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('録音の開始に失敗しました');
      onError?.(err);
      Alert.alert('エラー', err.message);
    }
  }, [onError]);

  // 録音停止
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    clearTimer();

    const actualDuration = Date.now() - startTimeRef.current;

    // 最小時間チェック
    if (actualDuration < RECORDING_CONFIG.MIN_DURATION_MS) {
      Alert.alert(
        '録音時間不足',
        `${RECORDING_CONFIG.MIN_DURATION_MS / 1000}秒以上話してください`
      );
      await cleanupRecording();
      return;
    }

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        onRecordingComplete?.(uri, actualDuration);
      }

      recordingRef.current = null;
      setDuration(0);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('録音の停止に失敗しました');
      onError?.(err);
      await cleanupRecording();
    }
  }, [clearTimer, cleanupRecording, onRecordingComplete, onError]);

  // 録音キャンセル
  const cancelRecording = useCallback(async () => {
    await cleanupRecording();
  }, [cleanupRecording]);

  return {
    isRecording,
    duration,
    progress,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
