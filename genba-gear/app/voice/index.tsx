/**
 * Voice Input Screen
 * 音声入力のメイン画面
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  VoiceRecorder,
  TranscriptEditor,
  ProcessingIndicator,
  ErrorView,
  VoiceProcessorService,
  VoiceProcessingState,
  StructuredWorkData,
} from '@/features/voice';
import { useDatabase } from '@/database';
import { WorkRecordRepository } from '@/database/repositories/WorkRecordRepository';

type ScreenState =
  | 'recording'
  | 'processing'
  | 'editing'
  | 'error';

export default function VoiceInputScreen() {
  const router = useRouter();
  const database = useDatabase();

  const [screenState, setScreenState] = useState<ScreenState>('recording');
  const [processingState, setProcessingState] = useState<VoiceProcessingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [structuredData, setStructuredData] = useState<StructuredWorkData | null>(null);
  const [workRecordId, setWorkRecordId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isQueued, setIsQueued] = useState(false);

  const voiceProcessor = useMemo(
    () => new VoiceProcessorService(database),
    [database]
  );

  const workRecordRepo = useMemo(
    () => new WorkRecordRepository(database),
    [database]
  );

  const handleRecordingComplete = useCallback(
    async (audioUri: string, duration: number) => {
      setScreenState('processing');
      setProcessingState('transcribing');

      try {
        const result = await voiceProcessor.processVoiceInput(audioUri);

        if (result.success && result.transcript && result.structuredData) {
          setTranscript(result.transcript);
          setStructuredData(result.structuredData);
          setWorkRecordId(result.workRecordId || null);
          setProcessingState('completed');
          setScreenState('editing');
        } else if (result.queued) {
          setIsQueued(true);
          setError(result.error || 'オフラインキューに追加しました');
          setScreenState('error');
        } else {
          setError(result.error || '処理に失敗しました');
          setScreenState('error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラー';
        setError(errorMessage);
        setScreenState('error');
      }
    },
    [voiceProcessor]
  );

  const handleConfirm = useCallback(
    async (editedData: StructuredWorkData) => {
      if (workRecordId) {
        // 既存の作業記録を更新
        try {
          await workRecordRepo.update(workRecordId, {
            extractedData: {
              siteName: editedData.location,
              workItems: editedData.tasks.map((task) => ({
                description: task.description,
                details: '',
                quantity: task.hours || 1,
                unit: '式',
                unitPrice: 0,
                taxRate: 10,
                completed: task.completed,
              })),
              materials: editedData.materials.map((m) => ({
                name: m.name,
                quantity: m.quantity,
                unitPrice: undefined,
              })),
              additionalWork: [],
              notes: editedData.notes.join('\n'),
            },
            workItems: editedData.tasks.map((task) => ({
              description: task.description,
              details: '',
              quantity: task.hours || 1,
              unit: '式',
              unitPrice: 0,
              taxRate: 10,
              completed: task.completed,
            })),
            notes: editedData.notes.join('\n'),
          });
          router.replace(`/draft/${workRecordId}`);
        } catch (err) {
          console.error('作業記録の更新に失敗:', err);
          setError('保存に失敗しました');
          setScreenState('error');
        }
      } else {
        // 新規作成（通常はここには来ない）
        router.replace('/');
      }
    },
    [workRecordId, workRecordRepo, router]
  );

  const handleRetry = useCallback(() => {
    setScreenState('recording');
    setProcessingState('idle');
    setTranscript('');
    setStructuredData(null);
    setWorkRecordId(null);
    setError('');
    setIsQueued(false);
  }, []);

  const handleManualInput = useCallback(() => {
    router.push('/manual-input');
  }, [router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleRecordingError = useCallback((err: Error) => {
    setError(err.message);
    setScreenState('error');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-navy">
      {/* ヘッダー */}
      {screenState !== 'editing' && (
        <View className="flex-row items-center justify-between px-4 py-4">
          <TouchableOpacity onPress={handleClose} className="p-2">
            <FontAwesome name="times" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">音声入力</Text>
          <View className="w-10" />
        </View>
      )}

      {/* 録音画面 */}
      {screenState === 'recording' && (
        <View className="flex-1 items-center justify-center px-6">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onError={handleRecordingError}
          />
        </View>
      )}

      {/* 処理中画面 */}
      {screenState === 'processing' && (
        <ProcessingIndicator state={processingState} />
      )}

      {/* 編集画面 */}
      {screenState === 'editing' && structuredData && (
        <TranscriptEditor
          transcript={transcript}
          structuredData={structuredData}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
          onManualInput={handleManualInput}
        />
      )}

      {/* エラー画面 */}
      {screenState === 'error' && (
        <ErrorView
          message={error}
          queued={isQueued}
          onRetry={handleRetry}
          onManualInput={handleManualInput}
          onClose={handleClose}
        />
      )}
    </SafeAreaView>
  );
}
