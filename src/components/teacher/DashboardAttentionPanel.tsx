import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, CreditCard, MessageSquare, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type AttentionVariant = 'warning' | 'neutral' | 'success';

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description?: string;
  to: string;
  icon: 'payment' | 'message' | 'schedule' | 'enrollment';
  variant: AttentionVariant;
}

interface DashboardAttentionPanelProps {
  items: DashboardAttentionItem[];
}

const iconMap = {
  payment: CreditCard,
  message: MessageSquare,
  schedule: CalendarClock,
  enrollment: Users,
} as const;

const variantStyles: Record<AttentionVariant, { bg: string; text: string }> = {
  warning: { bg: 'bg-muted', text: 'text-foreground' },
  neutral: { bg: 'bg-muted', text: 'text-muted-foreground' },
  success: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

export function DashboardAttentionPanel({ items }: DashboardAttentionPanelProps) {
  const hasIssues = items.length > 0;

  return (
    <section>
      <h2 className="text-base font-medium mb-3 text-foreground">Status</h2>
      <Card className="p-4">
        {hasIssues ? (
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = iconMap[item.icon];
              const styles = variantStyles[item.variant];
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className="group flex items-center gap-4 rounded-lg px-2 py-3 outline-none smooth-transition hover:bg-muted/50 focus-visible:bg-muted/50"
                >
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${styles.bg} ${styles.text}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-sm mt-0.5 text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Alt ser bra ut</p>
              <p className="text-sm mt-0.5 text-muted-foreground">
                Ingen betalinger, meldinger eller kurs trenger oppfølging nå.
              </p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
