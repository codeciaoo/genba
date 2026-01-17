/**
 * Manual Input Screen
 * 手動作業記録入力画面（音声認識失敗時のフォールバック）
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button } from '@/components/ui/Button';
import { useDatabase } from '@/database';
import { WorkRecordRepository } from '@/database/repositories/WorkRecordRepository';
import { getCurrentLocation } from '@/services/location';
import { getWeather } from '@/services/weather';

interface WorkItem {
  id: string;
  content: string;
}

export default function ManualInputScreen() {
  const router = useRouter();
  const database = useDatabase();

  const [siteName, setSiteName] = useState('');
  const [workItems, setWorkItems] = useState<WorkItem[]>([
    { id: '1', content: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addWorkItem = () => {
    setWorkItems([
      ...workItems,
      { id: Date.now().toString(), content: '' },
    ]);
  };

  const updateWorkItem = (id: string, content: string) => {
    setWorkItems(
      workItems.map((item) =>
        item.id === id ? { ...item, content } : item
      )
    );
  };

  const removeWorkItem = (id: string) => {
    if (workItems.length > 1) {
      setWorkItems(workItems.filter((item) => item.id !== id));
    }
  };

  const handleSave = async () => {
    // バリデーション
    if (!siteName.trim()) {
      Alert.alert('エラー', '現場名を入力してください');
      return;
    }
    if (!workItems.some((item) => item.content.trim())) {
      Alert.alert('エラー', '作業内容を1つ以上入力してください');
      return;
    }

    setIsLoading(true);

    try {
      // GPS/天気取得
      const location = await getCurrentLocation();
      let weather = null;
      if (location) {
        weather = await getWeather(location.latitude, location.longitude);
      }

      // 作業記録を作成
      const workRecordRepo = new WorkRecordRepository(database);
      const validWorkItems = workItems
        .filter((item) => item.content.trim())
        .map((item) => ({
          description: item.content.trim(),
          details: '',
          quantity: 1,
          unit: '式',
          unitPrice: 0,
          taxRate: 10,
          completed: false,
        }));

      const workRecord = await workRecordRepo.create({
        voiceTranscript: undefined,
        extractedData: {
          siteName: siteName.trim(),
          workItems: validWorkItems,
          materials: [],
          additionalWork: [],
          notes: notes.trim() || undefined,
        },
        workItems: validWorkItems,
        materials: [],
        notes: notes.trim() || undefined,
        status: 'draft',
        recordedAt: new Date(),
      });

      // 下書き確認画面へ遷移
      router.replace(`/draft/${workRecord.id}`);
    } catch (error) {
      console.error('作業記録の保存に失敗:', error);
      Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '作業記録を入力',
          headerLeft: () => (
            <TouchableOpacity onPress={handleClose} className="p-2">
              <FontAwesome name="times" size={20} color="#1a1f3d" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 bg-background"
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-4">
            {/* 現場名 */}
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-2">現場名</Text>
              <TextInput
                value={siteName}
                onChangeText={setSiteName}
                placeholder="田中邸、○○ビル など"
                className="bg-surface border border-gray-300 rounded-lg p-4 text-base"
                autoFocus
              />
            </View>

            {/* 作業内容リスト */}
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-2">作業内容</Text>
              {workItems.map((item, index) => (
                <View
                  key={item.id}
                  className="flex-row items-center mb-2 gap-2"
                >
                  <TextInput
                    value={item.content}
                    onChangeText={(text) => updateWorkItem(item.id, text)}
                    placeholder={`作業${index + 1}を入力`}
                    className="flex-1 bg-surface border border-gray-300 rounded-lg p-4 text-base"
                  />
                  {workItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeWorkItem(item.id)}
                      className="p-3"
                    >
                      <FontAwesome
                        name="times-circle"
                        size={24}
                        color="#c73b3b"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                onPress={addWorkItem}
                className="border border-dashed border-primary rounded-lg p-4 items-center"
              >
                <Text className="text-primary font-semibold">
                  ＋ 作業を追加
                </Text>
              </TouchableOpacity>
            </View>

            {/* 備考 */}
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-2">
                備考・メモ（任意）
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="特記事項があれば入力"
                multiline
                numberOfLines={3}
                className="bg-surface border border-gray-300 rounded-lg p-4 text-base min-h-[100px]"
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* フッター */}
        <View className="bg-surface border-t border-gray-200 p-4">
          <Button
            fullWidth
            size="lg"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
          >
            記録を保存
          </Button>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
