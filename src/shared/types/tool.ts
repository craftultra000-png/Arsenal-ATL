import type { ArsenalIconName } from '@shared/ui/icons';

export type ToolCategory = 'video' | 'audio' | 'image' | 'pdf' | 'text' | 'utility';

export interface ToolDefinition {
  slug: string;
  id: string;
  category: ToolCategory;
  icon: ArsenalIconName;
  accent: string;
  title: string;
  description: string;
  keywords: string[];
  legacyPath: string;
}
