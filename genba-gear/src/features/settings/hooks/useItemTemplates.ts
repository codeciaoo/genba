import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import type { ItemTemplate, CreateItemTemplateInput, UpdateItemTemplateInput } from '../domain/types';

interface UseItemTemplatesReturn {
  templates: ItemTemplate[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTemplate: (input: CreateItemTemplateInput) => Promise<{ data: ItemTemplate | null; error: string | null }>;
  updateTemplate: (id: string, input: UpdateItemTemplateInput) => Promise<{ error: string | null }>;
  deleteTemplate: (id: string) => Promise<{ error: string | null }>;
}

export function useItemTemplates(): UseItemTemplatesReturn {
  const { user } = useAuthContext();
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('item_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const items: ItemTemplate[] = (data || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        description: item.description,
        unit: item.unit,
        unitPrice: item.unit_price,
        taxRate: item.tax_rate as 10 | 8,
        category: item.category,
        keywords: item.keywords || [],
        sortOrder: item.sort_order,
        isActive: item.is_active,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      setTemplates(items);
    } catch (err) {
      console.error('Error fetching item templates:', err);
      setError('品目テンプレートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(
    async (input: CreateItemTemplateInput): Promise<{ data: ItemTemplate | null; error: string | null }> => {
      if (!user) {
        return { data: null, error: 'ユーザー情報が取得できませんでした' };
      }

      try {
        const { data, error: insertError } = await supabase
          .from('item_templates')
          .insert({
            user_id: user.id,
            name: input.name,
            description: input.description || null,
            unit: input.unit,
            unit_price: input.unitPrice,
            tax_rate: input.taxRate,
            category: input.category || null,
            keywords: input.keywords || [],
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        const newTemplate: ItemTemplate = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          description: data.description,
          unit: data.unit,
          unitPrice: data.unit_price,
          taxRate: data.tax_rate as 10 | 8,
          category: data.category,
          keywords: data.keywords || [],
          sortOrder: data.sort_order,
          isActive: data.is_active,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        await fetchTemplates();
        return { data: newTemplate, error: null };
      } catch (err) {
        console.error('Error creating item template:', err);
        return { data: null, error: '品目テンプレートの登録に失敗しました' };
      }
    },
    [user, fetchTemplates]
  );

  const updateTemplate = useCallback(
    async (id: string, input: UpdateItemTemplateInput): Promise<{ error: string | null }> => {
      try {
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.unit !== undefined) updateData.unit = input.unit;
        if (input.unitPrice !== undefined) updateData.unit_price = input.unitPrice;
        if (input.taxRate !== undefined) updateData.tax_rate = input.taxRate;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.keywords !== undefined) updateData.keywords = input.keywords;
        if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
        if (input.isActive !== undefined) updateData.is_active = input.isActive;

        const { error: updateError } = await supabase
          .from('item_templates')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await fetchTemplates();
        return { error: null };
      } catch (err) {
        console.error('Error updating item template:', err);
        return { error: '品目テンプレートの更新に失敗しました' };
      }
    },
    [fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      try {
        // 論理削除（is_activeをfalseに）
        const { error: deleteError } = await supabase
          .from('item_templates')
          .update({ is_active: false })
          .eq('id', id);

        if (deleteError) {
          throw deleteError;
        }

        await fetchTemplates();
        return { error: null };
      } catch (err) {
        console.error('Error deleting item template:', err);
        return { error: '品目テンプレートの削除に失敗しました' };
      }
    },
    [fetchTemplates]
  );

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
