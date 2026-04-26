import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Building, ExternalLink, MapPin } from '@/lib/icons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { removeSpaceMember, type MySpace } from '@/services/spaces';

interface Props {
  space: MySpace;
  onChanged: () => Promise<void>;
}

const LEAVE_BODY =
  'Kursene dine vises ikke lenger på fellessiden. Du kan komme tilbake senere hvis administratoren inviterer deg på nytt.';

export function TenantSpaceCard({ space, onChanged }: Props) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    const { error } = await removeSpaceMember(space.id, space.myOrganizationId);
    setLeaving(false);
    if (error) {
      toast.error('Kunne ikke melde deg ut');
      return;
    }
    toast.success(`Du er meldt ut av ${space.name}`);
    setConfirmLeave(false);
    void onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
            <Building className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{space.name}</h2>
              <Badge variant="neutral" shape="rect" size="sm" className="shrink-0">
                Medlem
              </Badge>
            </div>
            <Link
              to={`/space/${space.slug}`}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              framio.no/space/{space.slug}
              <ExternalLink className="size-3" />
            </Link>
            {space.city && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {space.city}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Kursene dine vises automatisk på fellessiden sammen med de andre instruktørenes.
        </p>

        <div className="flex justify-end">
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => setConfirmLeave(true)}
            disabled={leaving}
          >
            Meld deg ut
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmLeave} onOpenChange={(o) => !o && setConfirmLeave(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Meld deg ut av {space.name}?</AlertDialogTitle>
            <AlertDialogDescription>{LEAVE_BODY}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              disabled={leaving}
              onClick={(e) => {
                e.preventDefault();
                void handleLeave();
              }}
            >
              {leaving ? 'Melder ut …' : 'Meld deg ut'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
