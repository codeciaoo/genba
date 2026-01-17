/**
 * Report Detail Screen
 * 日報詳細画面
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button } from '@/components/ui/Button';
import { useDatabase } from '@/database';
import { DailyReportRepository } from '@/database/repositories/DailyReportRepository';
import DailyReport from '@/database/models/DailyReport';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const database = useDatabase();

  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dailyReportRepo = useMemo(
    () => new DailyReportRepository(database),
    [database]
  );

  // データ取得
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const result = await dailyReportRepo.findById(id);
        setReport(result);
      } catch (error) {
        console.error('日報の取得に失敗:', error);
        Alert.alert('エラー', 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, dailyReportRepo]);

  // 日付フォーマット
  const formatDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[date.getDay()];
    return `${year}年${month}月${day}日（${dayName}）`;
  }, []);

  // 共有
  const handleShare = useCallback(async () => {
    if (!report) return;

    try {
      const workItemsText = report.workItems
        .map((item) => `・${item.description}${item.completed ? '（完了）' : ''}`)
        .join('\n');

      const message = `【日報】${formatDate(report.reportDate)}

${report.notes ? `現場: ${report.notes}\n\n` : ''}作業内容:
${workItemsText}

${report.weather ? `天気: ${report.weather}` : ''}
${report.temperature ? `気温: ${report.temperature}℃` : ''}
`.trim();

      await Share.share({ message });
    } catch (error) {
      console.error('共有に失敗:', error);
    }
  }, [report, formatDate]);

  // 削除
  const handleDelete = useCallback(() => {
    Alert.alert(
      '確認',
      'この日報を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await dailyReportRepo.delete(id);
              router.replace('/');
            } catch (error) {
              console.error('削除に失敗:', error);
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]
    );
  }, [id, dailyReportRepo, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '日報詳細' }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#147878" />
        </View>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Stack.Screen options={{ title: '日報詳細' }} />
        <View className="flex-1 items-center justify-center bg-background">
          <Text className="text-gray-500">日報が見つかりません</Text>
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
          title: '日報詳細',
          headerRight: () => (
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={handleShare} className="p-2">
                <FontAwesome name="share-alt" size={20} color="#147878" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} className="p-2">
                <FontAwesome name="trash-o" size={20} color="#c73b3b" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView className="flex-1 bg-background">
        {/* ヘッダー情報 */}
        <View className="bg-primary p-6">
          <Text className="text-white/80 text-sm mb-1">日報</Text>
          <Text className="text-white text-2xl font-bold">
            {formatDate(report.reportDate)}
          </Text>
          {report.weather && (
            <View className="flex-row items-center mt-2">
              <FontAwesome name="cloud" size={16} color="#ffffff" />
              <Text className="text-white/80 ml-2">
                {report.weather}
                {report.temperature && ` / ${report.temperature}℃`}
              </Text>
            </View>
          )}
        </View>

        <View className="p-4">
          {/* 作業内容 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-3 text-lg">作業内容</Text>
            {report.workItems.map((item, index) => (
              <View
                key={index}
                className="bg-surface border border-gray-200 rounded-lg p-4 mb-2"
              >
                <View className="flex-row items-start">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                      item.completed ? 'bg-success' : 'bg-gray-300'
                    }`}
                  >
                    <FontAwesome
                      name={item.completed ? 'check' : 'circle-o'}
                      size={12}
                      color="#fff"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 text-base">
                      {item.description}
                    </Text>
                    {item.details && (
                      <Text className="text-gray-500 text-sm mt-1">
                        {item.details}
                      </Text>
                    )}
                    <Text className="text-gray-400 text-sm mt-1">
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* 材料 */}
          {report.materials && report.materials.length > 0 && (
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-3 text-lg">
                使用材料
              </Text>
              {report.materials.map((material, index) => (
                <View
                  key={index}
                  className="bg-surface border border-gray-200 rounded-lg p-3 mb-2"
                >
                  <Text className="text-gray-700">
                    {material.name} - {material.quantity}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 追加作業 */}
          {report.additionalWork && report.additionalWork.length > 0 && (
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-3 text-lg">
                追加作業
              </Text>
              {report.additionalWork.map((item, index) => (
                <View
                  key={index}
                  className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-2"
                >
                  <Text className="text-gray-700">{item.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 備考 */}
          {report.notes && (
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-3 text-lg">
                備考・メモ
              </Text>
              <View className="bg-surface border border-gray-200 rounded-lg p-4">
                <Text className="text-gray-700 leading-relaxed">
                  {report.notes}
                </Text>
              </View>
            </View>
          )}

          {/* 作業者情報 */}
          {(report.workerName || report.workHours) && (
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-3 text-lg">
                作業者情報
              </Text>
              <View className="bg-surface border border-gray-200 rounded-lg p-4">
                {report.workerName && (
                  <View className="flex-row items-center mb-2">
                    <FontAwesome name="user" size={16} color="#666" />
                    <Text className="text-gray-700 ml-2">{report.workerName}</Text>
                  </View>
                )}
                {report.workHours && (
                  <View className="flex-row items-center">
                    <FontAwesome name="clock-o" size={16} color="#666" />
                    <Text className="text-gray-700 ml-2">
                      {report.workHours}時間
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* フッター */}
      <View className="bg-surface border-t border-gray-200 p-4 gap-3">
        <Button
          fullWidth
          size="lg"
          onPress={handleShare}
          leftIcon={<FontAwesome name="share-alt" size={18} color="#fff" />}
        >
          日報を共有
        </Button>
        <Button variant="outline" fullWidth size="md" onPress={() => router.push('/')}>
          ホームに戻る
        </Button>
      </View>
    </>
  );
}
