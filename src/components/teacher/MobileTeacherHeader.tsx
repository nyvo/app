import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface MobileTeacherHeaderProps {
  title: string;
}

export const MobileTeacherHeader: React.FC<MobileTeacherHeaderProps> = ({ title }) => {
  return (
    <div className="flex md:hidden items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-xl z-30 shrink-0">
      <p className="type-title text-foreground" aria-hidden="true">{title}</p>
      <SidebarTrigger />
    </div>
  );
};
