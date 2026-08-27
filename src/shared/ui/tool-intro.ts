import type { ToolShell } from '@shared/ui/tool-shell';
import type { ToolDefinition } from '@shared/types/tool';
import { iconSvg } from '@shared/ui/icons';

export function renderToolIntro(shell: ToolShell, tool: ToolDefinition): void {
  shell.content.innerHTML = `
    <div class="tool-intro" style="--tool-accent:${tool.accent}">
      <div class="tool-intro__icon" aria-hidden="true">${iconSvg(tool.icon)}</div>
      <div>
        <h2>نسخة مستقلة قيد النقل</h2>
        <p>هذه الصفحة هي نقطة الدخول المستقلة لـ <strong>${tool.title}</strong>. ستنتقل منطق المعالجة إليها مباشرةً من دون iframe أو محمّل أدوات مركزي.</p>
        <p class="arsenal-muted">المسار الجديد ثابت ومهيأ للفهرسة: <code>/tools/${tool.slug}/</code></p>
      </div>
    </div>
  `;
  shell.setStatus('تم تحميل صفحة الأداة المستقلة بنجاح.', 'success');
}
