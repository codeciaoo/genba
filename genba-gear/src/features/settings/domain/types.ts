export interface ItemTemplate {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  taxRate: 10 | 8;
  category: string | null;
  keywords: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemTemplateInput {
  name: string;
  description?: string;
  unit: string;
  unitPrice: number;
  taxRate: 10 | 8;
  category?: string;
  keywords?: string[];
}

export interface UpdateItemTemplateInput extends Partial<CreateItemTemplateInput> {
  sortOrder?: number;
  isActive?: boolean;
}
