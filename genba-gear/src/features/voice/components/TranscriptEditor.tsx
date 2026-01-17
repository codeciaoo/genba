/**
 * TranscriptEditor Component
 * 文字起こし結果の確認・修正UI
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button } from '@/components/ui/Button';
import { StructuredWorkData } from '../types';

interface TranscriptEditorProps {
  transcript: string;
  structuredData: StructuredWorkData;
  onConfirm: (editedData: StructuredWorkData) => void;
  onRetry: () => void;
  onManualInput: () => void;
}

export function TranscriptEditor({
  transcript,
  structuredData,
  onConfirm,
  onRetry,
  onManualInput,
}: TranscriptEditorProps) {
  const [editedData, setEditedData] = useState<StructuredWorkData>(structuredData);
  const [showTranscript, setShowTranscript] = useState(false);

  const updateLocation = (location: string) => {
    setEditedData((prev) => ({ ...prev, location }));
  };

  const updateTask = (index: number, description: string) => {
    setEditedData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task, i) =>
        i === index ? { ...task, description } : task
      ),
    }));
  };

  const removeTask = (index: number) => {
    setEditedData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const addTask = () => {
    setEditedData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { description: '', completed: false }],
    }));
  };

  const updateNotes = (notes: string) => {
    setEditedData((prev) => ({
      ...prev,
      notes: notes.split('\n').filter((n) => n.trim()),
    }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
        {/* 元の文字起こし（折りたたみ可能） */}
        <TouchableOpacity
          onPress={() => setShowTranscript(!showTranscript)}
          className="flex-row items-center justify-between p-4 bg-surface border-b border-gray-200"
        >
          <View className="flex-row items-center gap-2">
            <FontAwesome name="file-text-o" size={16} color="#666" />
            <Text className="text-gray-600 text-sm">音声認識結果</Text>
          </View>
          <FontAwesome
            name={showTranscript ? 'chevron-up' : 'chevron-down'}
            size={12}
            color="#666"
          />
        </TouchableOpacity>

        {showTranscript && (
          <View className="p-4 bg-gray-50 border-b border-gray-200">
            <Text className="text-gray-700 text-sm leading-relaxed">{transcript}</Text>
          </View>
        )}

        {/* 編集フォーム */}
        <View className="p-4">
          {/* 現場名 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-2">現場名</Text>
            <TextInput
              value={editedData.location}
              onChangeText={updateLocation}
              placeholder="田中邸、○○ビル など"
              className="bg-surface border border-gray-300 rounded-lg p-4 text-base"
            />
          </View>

          {/* 作業内容 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-2">作業内容</Text>
            {editedData.tasks.map((task, index) => (
              <View
                key={index}
                className="flex-row items-center mb-2 gap-2"
              >
                <TextInput
                  value={task.description}
                  onChangeText={(text) => updateTask(index, text)}
                  placeholder={`作業${index + 1}を入力`}
                  className="flex-1 bg-surface border border-gray-300 rounded-lg p-4 text-base"
                />
                {editedData.tasks.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeTask(index)}
                    className="p-3"
                  >
                    <FontAwesome name="times-circle" size={24} color="#c73b3b" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={addTask}
              className="border border-dashed border-primary rounded-lg p-4 items-center"
            >
              <Text className="text-primary font-semibold">＋ 作業を追加</Text>
            </TouchableOpacity>
          </View>

          {/* 材料（表示のみ） */}
          {editedData.materials.length > 0 && (
            <View className="mb-6">
              <Text className="text-navy font-semibold mb-2">使用材料</Text>
              {editedData.materials.map((material, index) => (
                <View
                  key={index}
                  className="bg-surface border border-gray-300 rounded-lg p-3 mb-2"
                >
                  <Text className="text-gray-700">
                    {material.name} - {material.quantity}
                    {material.unit && ` ${material.unit}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 備考 */}
          <View className="mb-6">
            <Text className="text-navy font-semibold mb-2">備考・メモ（任意）</Text>
            <TextInput
              value={editedData.notes.join('\n')}
              onChangeText={updateNotes}
              placeholder="特記事項があれば入力"
              multiline
              numberOfLines={3}
              className="bg-surface border border-gray-300 rounded-lg p-4 text-base min-h-[100px]"
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* フッター（固定） */}
      <View className="bg-surface border-t border-gray-200 p-4 gap-3">
        <Button fullWidth size="lg" onPress={() => onConfirm(editedData)}>
          この内容で確定
        </Button>

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            fullWidth
            size="md"
            onPress={onRetry}
            leftIcon={<FontAwesome name="microphone" size={16} color="#1a1f3d" />}
          >
            録り直す
          </Button>
          <Button
            variant="ghost"
            fullWidth
            size="md"
            onPress={onManualInput}
          >
            手動で入力
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
