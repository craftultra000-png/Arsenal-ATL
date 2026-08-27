import '@shared/ui/tool-shell.css';
import '@shared/ui/arsenal-select.css';
import { toolBySlug } from '@shared/tools';
import { mountToolShell, type ToolShell } from '@shared/ui/tool-shell';

export type ToolRenderer = (shell: ToolShell) => void | Promise<void>;

export async function bootstrapStandaloneTool(slug: string, render: ToolRenderer): Promise<void> {
  const tool = toolBySlug(slug);
  const mount = document.querySelector<HTMLElement>('#app');
  if (!tool || !mount) {
    throw new Error('تعذر تهيئة صفحة الأداة.');
  }

  const shell = mountToolShell(mount, tool);
  try {
    await render(shell);
  } catch (error) {
    console.error(`[${slug}]`, error);
    shell.content.innerHTML = `
      <div class="tool-error" role="alert">
        <strong>تعذر تهيئة الأداة</strong>
        <p>حاول إعادة تحميل الصفحة. يبقى الخطأ محصوراً بهذه الأداة ولا يؤثر في بقية المنصة.</p>
      </div>
    `;
    shell.setStatus(error instanceof Error ? error.message : 'حدث خطأ غير متوقع.', 'error');
  }
}
