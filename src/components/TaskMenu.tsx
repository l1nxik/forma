import { useEffect, useRef } from 'react';
import { Pencil, Sun, Play, Trash2 } from 'lucide-react';
import type { Task } from '../api/client';
import { useI18n } from '../i18n';
export function TaskMenu({
  task,
  x,
  y,
  inPlan,
  onClose,
  onOpen,
  onDelete,
  onPlan,
  onFocus,
}: {
  task: Task;
  x: number;
  y: number;
  inPlan: boolean;
  onClose: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onPlan: () => void;
  onFocus: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector('button')?.focus();
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={task.title}
      className="context-menu"
      style={{
        left: Math.max(8, Math.min(x, window.innerWidth - 225)),
        top: Math.max(8, Math.min(y, window.innerHeight - 200)),
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const buttons = Array.from(
            ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
          );
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[
            (index + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length
          ]?.focus();
        }
      }}
    >
      <button role="menuitem" onClick={onOpen}>
        <Pencil size={15} />
        {t('task.open')}
      </button>
      <button role="menuitem" onClick={onPlan}>
        <Sun size={15} />
        {t(inPlan ? 'today.remove' : 'today.add')}
      </button>
      {!task.completed && (
        <button role="menuitem" onClick={onFocus}>
          <Play size={15} />
          {t('focus.start')}
        </button>
      )}
      <div className="menu-divider" />
      <button role="menuitem" className="danger-text" onClick={onDelete}>
        <Trash2 size={15} />
        {t('common.delete')}…
      </button>
    </div>
  );
}
