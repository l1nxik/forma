import { useEffect } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { isMac } from './platform';

/** Keep one native material aligned with the DOM, only when layout changes. */
export function useSidebarGlass(visible: boolean) {
  useEffect(() => {
    if (!isTauri() || !isMac) return;
    const root = document.documentElement;
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    const reduced = matchMedia('(prefers-reduced-transparency: reduce)');
    let disposed = false;
    let scheduled = 0;
    let last = '';
    let sequence = 0;
    const update = () => {
      cancelAnimationFrame(scheduled);
      scheduled = requestAnimationFrame(() => {
        const box =
          visible &&
          sidebar &&
          Number.parseFloat(root.style.getPropertyValue('--glass-opacity') || '100') < 100 &&
          !reduced.matches &&
          !root.dataset.palette?.startsWith('high-contrast')
            ? sidebar.getBoundingClientRect()
            : null;
        const frame = box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
        const key = JSON.stringify(frame);
        if (key === last) return;
        last = key;
        const request = ++sequence;
        void invoke<boolean>('set_sidebar_glass', { frame })
          .then((applied) => {
            if (!disposed && request === sequence)
              root.dataset.nativeGlass = applied && !!frame ? 'true' : 'false';
          })
          .catch(() => {
            if (!disposed) root.dataset.nativeGlass = 'false';
          });
      });
    };
    const observer = new ResizeObserver(update);
    if (sidebar) observer.observe(sidebar);
    const palette = new MutationObserver(update);
    palette.observe(root, { attributes: true, attributeFilter: ['data-palette', 'style'] });
    window.addEventListener('resize', update);
    reduced.addEventListener('change', update);
    update();
    return () => {
      disposed = true;
      cancelAnimationFrame(scheduled);
      observer.disconnect();
      palette.disconnect();
      window.removeEventListener('resize', update);
      reduced.removeEventListener('change', update);
    };
  }, [visible]);
}
