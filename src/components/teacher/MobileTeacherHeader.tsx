import React from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Mobile-only top bar (hidden ≥md, where the persistent sidebar rail shows).
 * Renders only a labeled "Meny" trigger on the left — the page title is shown
 * in-content by PageShell / page-state, so repeating it here would just
 * duplicate the h1. The trigger sits on the left to match the left-opening
 * drawer (tap origin = drawer origin).
 *
 * Why `fixed` (not `sticky`): each teacher page is its own `overflow-y-auto`
 * container but grows with content (`min-h-full`), so in practice the window
 * scrolls and the page's scroll container never scrolls internally — which
 * defeats `position: sticky`. `fixed` pins to the viewport regardless, keeping
 * the menu reachable at any scroll position. The sibling spacer preserves the
 * bar's space in normal flow (its height mirrors the bar: safe-area inset +
 * py-2 (16px) + button h-9 (36px) + 1px border = inset + 53px).
 */
export const MobileTeacherHeader: React.FC = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex md:hidden items-center border-b border-border bg-surface-elevated px-2 py-2 backdrop-blur-xl safe-area-top">
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          className="gap-2 px-3 text-foreground"
        >
          <PanelLeft />
          Meny
        </Button>
      </div>
      <div
        aria-hidden
        className="md:hidden shrink-0 h-[calc(env(safe-area-inset-top,0px)+53px)]"
      />
    </>
  );
};
