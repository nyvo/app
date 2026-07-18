import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TeacherSidebar } from './TeacherSidebar';

const signOut = vi.fn(async () => undefined);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut,
    profile: { name: 'Kari Nordmann', email: 'kari@example.no', role: 'buyer' },
    currentSeller: null,
    sellers: [],
    sellersLoadFailed: false,
  }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/overview']}>
      <TooltipProvider>
        <SidebarProvider defaultOpen>
          <TeacherSidebar />
          <main />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('TeacherSidebar desktop collapse', () => {
  beforeEach(() => {
    window.innerWidth = 1280;
    signOut.mockClear();
  });

  it('collapses to an icon rail and keeps the same sidebar icon in the header', () => {
    const { container } = renderSidebar();
    const sidebar = container.querySelector<HTMLElement>('[data-slot="sidebar"][data-state]');
    const header = container.querySelector<HTMLElement>('[data-sidebar="header"]');

    expect(sidebar).toHaveAttribute('data-state', 'expanded');
    expect(header).not.toBeNull();

    const toggle = within(header!).getByRole('button', { name: 'Skjul sidemeny' });
    expect(toggle).toHaveAttribute('data-sidebar', 'trigger');
    const toggleIcon = toggle.querySelector('svg');
    expect(toggleIcon).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(sidebar).toHaveAttribute('data-state', 'collapsed');
    expect(sidebar).toHaveAttribute('data-collapsible', 'icon');

    const collapsedToggle = within(header!).getByRole('button', { name: 'Vis sidemeny' });
    expect(collapsedToggle).toBe(toggle);
    expect(collapsedToggle.querySelector('svg')).toBe(toggleIcon);
    expect(screen.getByRole('link', { name: 'Raden' })).toHaveClass(
      'group-data-[collapsible=icon]:hidden',
    );
    const overview = screen.getByRole('link', { name: 'Oversikt' });
    expect(overview).toHaveClass('transition-colors', 'duration-150', 'ease');
    expect(overview.className).not.toContain('width');
    expect(overview.className).not.toContain('height');
    expect(overview.className).not.toContain('padding');
  });
});
