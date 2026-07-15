import React from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Height of the fixed bar's chrome below the safe-area inset: py-2 (16px)
 * + the default Button's h-10 (40px) + border-b (1px) = 57px. Both the bar
 * (as an explicit min-height, so it can't silently drift from its own
 * padding/button sizing) and the sibling spacer below derive from this one
 * constant instead of duplicating the number.
 */
export const MOBILE_HEADER_HEIGHT = 57;

/**
 * Compact-screen top bar (hidden ≥lg, where the persistent sidebar shows).
 * Renders only an icon trigger on the left — the page title is shown in-content
 * by PageShell / page-state, so repeating it here would just duplicate the h1.
 * The trigger sits on the left to match the left-opening drawer (tap origin =
 * drawer origin).
 *
 * Why `fixed` (not `sticky`): the teacher shell owns an internal scroll
 * container, so `fixed` pins the menu to the viewport regardless of which
 * element is scrolling. The sibling spacer preserves the bar's space in
 * normal flow (its height mirrors the bar: safe-area inset +
 * `MOBILE_HEADER_HEIGHT`).
 */
export const MobileTeacherHeader: React.FC = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-30 flex items-center border-b border-sidebar-border bg-sidebar px-2 py-2 safe-area-top lg:hidden"
        style={{
          minHeight: `calc(env(safe-area-inset-top, 0px) + ${MOBILE_HEADER_HEIGHT}px)`,
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeft />
          <span className="sr-only">Vis sidemeny</span>
        </Button>
      </div>
      <div
        aria-hidden
        className="shrink-0 lg:hidden"
        style={{
          height: `calc(env(safe-area-inset-top, 0px) + ${MOBILE_HEADER_HEIGHT}px)`,
        }}
      />
    </>
  );
};
