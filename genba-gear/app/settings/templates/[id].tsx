import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useItemTemplates } from '@/features/settings/hooks/useItemTemplates';

type TaxRate = 10 | 8;

export default function EditItemTemplateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { templates, createTemplate, updateTemplate } = useItemTemplates();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxRate, setTaxRate] = useState<TaxRate>(10);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 編集時は既存データを設定
  useEffect(() => {
    if (!isNew && id) {
      const template = templates.find((t) => t.id === id);
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setUnit(template.unit);
        setUnitPrice(String(template.unitPrice));
        setTaxRate(template.taxRate);
        setCategory(template.category || '');
      }
    }
  }, [isNew, id, templates]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '品目名を入力してください';
    }

    if (!unit.trim()) {
      newErrors.unit = '単位を入力してください';
    }

    if (!unitPrice.trim()) {
      newErrors.unitPrice = '単価を入力してください';
    } else if (isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      newErrors.unitPrice = '有効な金額を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (isNew) {
        const { error } = await createTemplate({
          name,
          description: description || undefined,
          unit,
          unitPrice: Number(unitPrice),
          taxRate,
          category: category || undefined,
        });

        if (error) {
          Alert.alert('エラー', error);
          return;
        }

        Alert.alert('完了', '品目テンプレートを登録しました', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error } = await updateTemplate(id!, {
          name,
          description: description || undefined,
          unit,
          unitPrice: Number(unitPrice),
          taxRate,
          category: category || undefined,
        });

        if (error) {
          Alert.alert('エラー', error);
          return;
        }

        Alert.alert('完了', '品目テンプレートを更新しました', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // よく使う単位の候補
  const unitSuggestions = ['式', '個', 'm', '時間', '日', '台', '本', 'kg', '㎡'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Card variant="elevated" padding="lg">
          <View className="gap-4">
            <Input
              label="品目名"
              placeholder="例: エアコン設置"
              value={name}
              onChangeText={setName}
              error={errors.name}
              required
            />

            <Input
              label="説明（任意）"
              placeholder="例: 家庭用エアコンの標準設置工事"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />

            <View>
              <Text className="text-sm font-medium text-navy mb-2">
                単位 <Text className="text-error">*</Text>
              </Text>
              <Input
                placeholder="例: 式"
                value={unit}
                onChangeText={setUnit}
                error={errors.unit}
              />
              <View className="flex-row flex-wrap gap-2 mt-2">
                {unitSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant={unit === suggestion ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setUnit(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </View>
            </View>

            <Input
              label="単価（税抜）"
              placeholder="10000"
              value={unitPrice}
              onChangeText={setUnitPrice}
              keyboardType="number-pad"
              error={errors.unitPrice}
              helperText="円単位で入力"
              required
            />

            <View>
              <Text className="text-sm font-medium text-navy mb-2">
                税率 <Text className="text-error">*</Text>
              </Text>
              <View className="flex-row gap-3">
                <Button
                  variant={taxRate === 10 ? 'primary' : 'outline'}
                  onPress={() => setTaxRate(10)}
                  size="md"
                  className="flex-1"
                >
                  10%（標準）
                </Button>
                <Button
                  variant={taxRate === 8 ? 'primary' : 'outline'}
                  onPress={() => setTaxRate(8)}
                  size="md"
                  className="flex-1"
                >
                  8%（軽減）
                </Button>
              </View>
            </View>

            <Input
              label="カテゴリ（任意）"
              placeholder="例: 空調工事"
              value={category}
              onChangeText={setCategory}
              helperText="品目を分類する場合に設定"
            />
          </View>
        </Card>

        {/* 計算結果プレビュー */}
        {unitPrice && !isNaN(Number(unitPrice)) && (
          <Card variant="default" padding="md" className="mt-4">
            <Text className="text-sm font-medium text-gray-500 mb-2">
              計算プレビュー（数量1の場合）
            </Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">税抜金額</Text>
              <Text className="font-semibold text-navy">
                ¥{Number(unitPrice).toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600">消費税（{taxRate}%）</Text>
              <Text className="font-semibold text-navy">
                ¥{Math.floor(Number(unitPrice) * (taxRate / 100)).toLocaleString()}
              </Text>
            </View>
            <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between items-center">
              <Text className="text-gray-600 font-medium">税込金額</Text>
              <Text className="font-bold text-primary text-lg">
                ¥{Math.floor(Number(unitPrice) * (1 + taxRate / 100)).toLocaleString()}
              </Text>
            </View>
          </Card>
        )}

        <View className="mt-6 mb-8">
          <Button onPress={handleSave} loading={loading} fullWidth size="lg">
            {isNew ? '登録する' : '保存する'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
