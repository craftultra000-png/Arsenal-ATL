import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const slugs = [
  'video-editor', 'video-compressor', 'video-to-audio',
  'audio-converter', 'noise-remover', 'audio-rate',
  'image-editor', 'background-remover', 'image-compressor',
  'pdf-create', 'pdf-compressor', 'pdf-editor',
  'text-encryption', 'text-filter', 'text-comparison',
  'qr-generator', 'archive-encryption', 'local-share'
];

for (const slug of slugs) {
  const source = `import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';\nimport { toolBySlug } from '@shared/tools';\nimport { renderToolIntro } from '@shared/ui/tool-intro';\n\nvoid bootstrapStandaloneTool('${slug}', (shell) => {\n  const tool = toolBySlug('${slug}');\n  if (!tool) throw new Error('تعذر العثور على تعريف الأداة.');\n  renderToolIntro(shell, tool);\n});\n`;
  await writeFile(resolve(root, `src/tools/${slug}/main.ts`), source, 'utf8');
}

console.log(`Created ${slugs.length} independent TypeScript entry points.`);
