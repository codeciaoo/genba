/**
 * Draft Detail Screen
 * 下書き確認・編集画面
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button } from '@/components/ui/Button';
import { useDatabase } from '@/database';
import { WorkRecordRepository } from '@/database/repositories/WorkRecordRepository';
import { DailyReportRepository } from '@/database/repositories/DailyReportRepository';
import WorkRecord, { WorkItem } from '@/database/models/WorkRecord';

export default function DraftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const database = useDatabase();

  const [workRecord, setWorkRecord] = useState<WorkRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 編集可能なフィールド
  const [siteName, setSiteName] = useState('');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [notes, setNotes] = useState('');

  const workRecordRepo = useMemo(
    () => new WorkRecordRepository(database),
    [database]
  );

  const dailyReportRepo = useMemo(
    () => new DailyReportRepository(database),
    [database]
  );

  // データ取得
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const record = await workRecordRepo.findById(id);
        if (record) {
          setWorkRecord(record);
          setSiteName(record.extractedData?.siteName || '');
          setWorkItems(record.workItems || []);
          setNotes(record.notes || '');
        }
      } catch (error) {
        console.error('作業記録の取得に失敗:', error);
        Alert.alert('エラー', 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, workRecordRepo]);

  // 作業項目の更新
  const updateWorkItem = useCallback(
    (index: number, field: keyof WorkItem, value: unknown) => {
      setWorkItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // 作業項目の追加
  const addWorkItem = useCallback(() => {
    setWorkItems((prev) => [
      ...prev,
      {
        description: '',
        details: '',
        quantity: 1,
        unit: '式',
        unitPrice: 0,
        taxRate: 10,
        completed: false,
      },
    ]);
  }, []);

  // 作業項目の削除
  const removeWorkItem = useCallback((index: number) => {
    setWorkItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      await workRecordRepo.update(id, {
        extractedData: {
          siteName,
          workItems,
          materials: workRecord?.materials || [],
          additionalWork: [],
          notes,
        },
        workItems,
        notes,
      });
      Alert.alert('保存完了', '作業記録を保存しました');
    } catch (error) {
      console.error('保存に失敗:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [id, siteName, workItems, notes, workRecord, workRecordRepo]);

  // 日報生成
  const handleGenerateReport = useCallback(async () => {
    if (!id || !workRecord) return;

    // バリデーション
    if (!siteName.trim()) {
      Alert.alert('エラー', '現場名を入力してください');
      return;
    }
    if (!workItems.some((item) => item.description.trim())) {
      Alert.alert('エラー', '作業内容を1つ以上入力してください');
      return;
    }

    setIsGenerating(true);
    try {
      // まず作業記録を更新
      await workRecordRepo.update(id, {
        extractedData: {
          siteName,
          workItems,
          materials: workRecord.materials || [],
          additionalWork: [],
          notes,
        },
        workItems,
        notes,
        status: 'confirmed',
      });

      // 日報を作成
      const report = await dailyReportRepo.create({
        workRecordId: id,
        siteId: workRecord.siteId || undefined,
        reportDate: new Date(),
        workItems,
        materials: workRecord.materials || [],
        additionalWork: [],
        notes,
      });

      // 日報詳細画面へ遷移
      router.replace(`/report/${report.id}`);
    } catch (error) {
      console.error('日報生成に失敗:', error);
      Alert.alert('エラー', '日報の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  }, [id, workRecord, siteName, workItems, notes, workRecordRepo, dailyReportRepo, router]);

  // 削除
  const handleDelete = useCallback(() => {
    Alert.alert(
      '確認',
      'この作業記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await workRecordRepo.delete(id);
              router.replace('/');
            } catch (error) {
              console.error('削除に失敗:', error);
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]
    );
  }, [id, workRecordRepo, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '下書き確認' }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#147878" />
        </View>
      </>
    );
  }

  if (!workRecord) {
    return (
      <>
        <Stack.Screen options={{ title: '下書き確認' }} />
        <View className="flex-1 items-center justify-center bg-background">
          <Text className="text-gray-500">作業記録が見つかりません</Text>
          <Button variant="ghost" onPress={() => router.back()} className="mt-4">
            戻る
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '下書き確認',
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} className="p-2">
              <FontAwesome name="trash-o" size={20} color="#c73b3b" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          {/* 音声認識結果（あれば） */}
          {workRecord.voiceTranscript && (
            <View className="bg-gray-50 rounded-lg p-4 mb-6">
              <Text className="text-gray-500 text-sm mb-2">音声認識結果</Text>
              <Text className="text-gray-700 text-sm leading-relaxed">
                {workRecord.voiceTranscript}
              </Text>
            </View>
          )}

          {/* 現場名 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-2">現場名</Text>
            <TextInput
              value={siteName}
              onChangeText={setSiteName}
              placeholder="田中邸、○○ビル など"
              className="bg-surface border border-gray-300 rounded-lg p-4 text-base"
            />
          </View>

          {/* 作業内容 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-2">作業内容</Text>
            {workItems.map((item, index) => (
              <View
                key={index}
                className="bg-surface border border-gray-300 rounded-lg p-4 mb-2"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <TextInput
                      value={item.description}
                      onChangeText={(text) =>
                        updateWorkItem(index, 'description', text)
                      }
                      placeholder="作業内容を入力"
                      className="text-base mb-2"
                      multiline
                    />
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        value={String(item.quantity)}
                        onChangeText={(text) =>
                          updateWorkItem(index, 'quantity', parseFloat(text) || 0)
                        }
                        keyboardType="numeric"
                        className="bg-gray-100 rounded px-3 py-2 w-16 text-center"
                      />
                      <Text className="text-gray-600">{item.unit}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateWorkItem(index, 'completed', !item.completed)
                        }
                        className={`flex-row items-center gap-1 px-3 py-2 rounded ${
                          item.completed ? 'bg-success/20' : 'bg-gray-100'
                        }`}
                      >
                        <FontAwesome
                          name={item.completed ? 'check-circle' : 'circle-o'}
                          size={16}
                          color={item.completed ? '#2d8a4e' : '#666'}
                        />
                        <Text
                          className={
                            item.completed ? 'text-success' : 'text-gray-600'
                          }
                        >
                          完了
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {workItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeWorkItem(index)}
                      className="p-2"
                    >
                      <FontAwesome name="times-circle" size={20} color="#c73b3b" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={addWorkItem}
              className="border border-dashed border-primary rounded-lg p-4 items-center"
            >
              <Text className="text-primary font-semibold">＋ 作業を追加</Text>
            </TouchableOpacity>
          </View>

          {/* 材料（表示のみ） */}
          {workRecord.materials && workRecord.materials.length > 0 && (
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-2">使用材料</Text>
              {workRecord.materials.map((material, index) => (
                <View
                  key={index}
                  className="bg-surface border border-gray-300 rounded-lg p-3 mb-2"
                >
                  <Text className="text-gray-700">
                    {material.name} - {material.quantity}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 備考 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-2">備考・メモ</Text>
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
      <View className="bg-surface border-t border-gray-200 p-4 gap-3">
        <Button
          fullWidth
          size="lg"
          onPress={handleGenerateReport}
          loading={isGenerating}
          disabled={isGenerating || isSaving}
          leftIcon={<FontAwesome name="file-text-o" size={18} color="#fff" />}
        >
          日報を生成
        </Button>
        <Button
          variant="outline"
          fullWidth
          size="md"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isGenerating}
        >
          下書きを保存
        </Button>
      </View>
    </>
  );
}
