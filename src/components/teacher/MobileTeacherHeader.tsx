import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface MobileTeacherHeaderProps {
  title: string;
}

export const MobileTeacherHeader: React.FC<MobileTeacherHeaderProps> = ({ title }) => {
  return (
    <div className="flex md:hidden items-center justify-between p-6 border-b border-zinc-200 bg-surface/80 backdrop-blur-xl z-30 shrink-0">
      <h1 className="font-geist text-base font-medium text-text-primary">{title}</h1>
      <SidebarTrigger />
    </div>
  );
};
