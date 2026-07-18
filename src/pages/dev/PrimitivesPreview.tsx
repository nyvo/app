import { useState } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { toast } from 'sonner';
import { DevPage, PreviewSection } from './_kit';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Badge, type badgeVariants } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { DateBadge } from '@/components/ui/date-badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem, RadioGroupCardItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { friendlyError } from '@/lib/error-messages';
import { formatKroner } from '@/lib/utils';
import { ExternalLink, Plus } from '@/lib/icons';

type ButtonVariant = NonNullable<ButtonProps['variant']>;
type ButtonSize = NonNullable<ButtonProps['size']>;
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const BUTTON_VARIANTS: ButtonVariant[] = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'soft',
  'destructive',
  'link',
  'plain',
];

// The "key" sizes called out for review — sm/icon are reserved-for-compact
// contexts per button.tsx's docblock, but still need coverage here.
const BUTTON_SIZES: ButtonSize[] = ['sm', 'default', 'lg', 'cta', 'icon'];

const BADGE_VARIANTS: BadgeVariant[] = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'success',
  'warning',
  'info',
  'neutral',
  'subtle',
  'inverted',
  'link',
];

function ButtonsSection() {
  return (
    <PreviewSection
      label="Knapper"
      description="Variant × størrelse-matrise (Button fra @/components/ui/button), samt loading, disabled og asChild."
    >
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-muted">
                <th className="p-3 text-left font-medium text-foreground-muted">Variant</th>
                {BUTTON_SIZES.map((size) => (
                  <th key={size} className="p-3 text-left font-medium text-foreground-muted">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUTTON_VARIANTS.map((variant) => (
                <tr key={variant} className="border-b border-border-subtle last:border-b-0">
                  <td className="p-3 font-medium text-foreground">{variant}</td>
                  {BUTTON_SIZES.map((size) => (
                    <td key={size} className="p-3">
                      {size === 'icon' ? (
                        <Button variant={variant} size={size} aria-label="Legg til">
                          <Plus />
                        </Button>
                      ) : (
                        <Button variant={variant} size={size}>
                          Knapp
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Tilstander</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>Lagrer</Button>
            <Button loading loadingText="Lagrer …">Lagre kurs</Button>
            <Button disabled>Deaktivert</Button>
            <Button variant="destructive" disabled>
              Deaktivert (destructive)
            </Button>
            <Button variant="link" asChild>
              <a href="https://raden.no" target="_blank" rel="noreferrer">
                Åpne i ny fane
                <ExternalLink className="ml-1 inline size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </PreviewSection>
  );
}

function BadgesSection() {
  return (
    <PreviewSection
      label="Merker"
      description="Alle 12 Badge-varianter (size md), pluss de typede wrapperne for kurs-, betalings- og påmeldingsstatus."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant} size="md">
              {variant}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">StatusBadge — kursstatus</p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="draft" />
            <StatusBadge status="upcoming" />
            <StatusBadge status="active" />
            <StatusBadge status="completed" />
            <StatusBadge status="cancelled" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            PaymentBadge — betalingsstatus (visibility="always" viser også "Betalt")
          </p>
          <div className="flex flex-wrap gap-2">
            <PaymentBadge status="paid" visibility="always" />
            <PaymentBadge status="pending" />
            <PaymentBadge status="failed" />
            <PaymentBadge status="refunded" />
            <PaymentBadge status="external" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">SignupStatusBadge — påmelding + betaling</p>
          <div className="flex flex-wrap gap-2">
            <SignupStatusBadge status="confirmed" paymentStatus="paid" />
            <SignupStatusBadge status="confirmed" paymentStatus="pending" />
            <SignupStatusBadge status="cancelled" paymentStatus="paid" />
            <SignupStatusBadge status="course_cancelled" paymentStatus="paid" />
            <SignupStatusBadge status="confirmed" paymentStatus="refunded" />
            <SignupStatusBadge status="confirmed" paymentStatus="refunded" refundIsPartial />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">DateBadge</p>
          <div className="flex flex-wrap items-end gap-3">
            <DateBadge dateStr="2026-07-12" />
            <DateBadge dateStr="2026-12-24" size="sm" />
            <DateBadge date={new Date()} />
          </div>
        </div>
      </div>
    </PreviewSection>
  );
}

function TogglesSection() {
  const [switchOn, setSwitchOn] = useState(true);
  const [switchSmOn, setSwitchSmOn] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('a');
  const [card, setCard] = useState('solo');

  return (
    <PreviewSection
      label="Valgkontroller"
      description="Switch, Checkbox og RadioGroup — valgt/på-tilstanden er azure (bg-primary = «valgt»-aksenten), av-tilstanden nøytral. Radiokortets radfylling holder seg nøytral (beslutning 2026-07-08) — bare sjekkruten er azure. Alle er interaktive."
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-8">
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
            Switch — {switchOn ? 'på' : 'av'}
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
            <Switch size="sm" checked={switchSmOn} onCheckedChange={setSwitchSmOn} />
            Switch sm — {switchSmOn ? 'på' : 'av'}
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
            Checkbox
          </label>
        </div>

        <RadioGroup value={radio} onValueChange={setRadio} className="flex w-auto gap-6">
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
            <RadioGroupItem value="a" />
            Alternativ A
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
            <RadioGroupItem value="b" />
            Alternativ B
          </label>
        </RadioGroup>

        <RadioGroup value={card} onValueChange={setCard} className="max-w-md">
          <RadioGroupCardItem
            value="solo"
            title="Individuell lærer"
            description="Jeg holder kurs i mitt eget navn."
          />
          <RadioGroupCardItem
            value="studio"
            title="Studio"
            description="Jeg representerer et studio eller en bedrift."
          />
        </RadioGroup>
      </div>
    </PreviewSection>
  );
}

function DialogsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [simpleConfirmOpen, setSimpleConfirmOpen] = useState(false);
  const [destructiveConfirmOpen, setDestructiveConfirmOpen] = useState(false);
  const [destructiveConfirmLoading, setDestructiveConfirmLoading] = useState(false);
  const [typeToConfirmValue, setTypeToConfirmValue] = useState('');

  const handleDestructiveConfirm = () => {
    setDestructiveConfirmLoading(true);
    window.setTimeout(() => {
      setDestructiveConfirmLoading(false);
      setDestructiveConfirmOpen(false);
      setTypeToConfirmValue('');
      toast.success('Studioet er slettet');
    }, 900);
  };

  return (
    <PreviewSection
      label="Dialoger"
      description="Dialog, AlertDialog og den sammensatte ConfirmDialog — hver med reell åpen/lukk-tilstand."
    >
      <div className="flex flex-wrap gap-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Åpne Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rediger kursnavn</DialogTitle>
              <DialogDescription>
                Navnet vises på den offentlige kurssiden og i påmeldingsbekreftelser.
              </DialogDescription>
            </DialogHeader>
            <Input defaultValue="Yin Yoga – kveldskurs" aria-label="Kursnavn" />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  toast.success('Kursnavnet er lagret');
                }}
              >
                Lagre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Åpne AlertDialog</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Avlys kurskvelden?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle påmeldte varsles på e-post. Dette kan ikke angres.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setAlertOpen(false);
                  toast.success('Kurskvelden er avlyst');
                }}
              >
                Avlys
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="outline" onClick={() => setSimpleConfirmOpen(true)}>
          Åpne ConfirmDialog
        </Button>
        <ConfirmDialog
          open={simpleConfirmOpen}
          onOpenChange={setSimpleConfirmOpen}
          title="Avbestill påmelding"
          body={
            <>
              Plassen til <strong>Kari Nordmann</strong> frigjøres umiddelbart.
            </>
          }
          actionLabel="Avbestill"
          onConfirm={() => {
            setSimpleConfirmOpen(false);
            toast.success('Påmeldingen er avbestilt');
          }}
        />

        <Button variant="destructive" onClick={() => setDestructiveConfirmOpen(true)}>
          Slett studio (destructive + typeToConfirm)
        </Button>
        <ConfirmDialog
          open={destructiveConfirmOpen}
          onOpenChange={(open) => {
            setDestructiveConfirmOpen(open);
            if (!open) setTypeToConfirmValue('');
          }}
          title="Slett studio"
          body={
            <>
              Dette sletter <strong>Yoga med Anne</strong> permanent, inkludert alle kurs og
              påmeldinger. Kan ikke angres.
            </>
          }
          actionLabel="Slett studio"
          destructive
          loading={destructiveConfirmLoading}
          loadingText="Sletter …"
          typeToConfirm="SLETT"
          typeToConfirmValue={typeToConfirmValue}
          onTypeToConfirmChange={setTypeToConfirmValue}
          onConfirm={handleDestructiveConfirm}
        />
      </div>
    </PreviewSection>
  );
}

function PanelsSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <PreviewSection
      label="Paneler"
      description="Drawer (Vaul bunnpanel) og Sheet (Radix sidepanel) — mobil- og desktop-motstykket til dialoger."
    >
      <div className="flex flex-wrap gap-3">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline">Åpne Drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Del kurs</DrawerTitle>
              <DrawerDescription>Kopier lenken eller del direkte til sosiale medier.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 py-4 text-sm text-foreground-muted">
              https://raden.no/yoga-med-anne/yin-yoga
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="secondary">Lukk</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Åpne Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Påmeldingsdetaljer</SheetTitle>
              <SheetDescription>Kari Nordmann · Yin Yoga, torsdag kl. 18:00</SheetDescription>
            </SheetHeader>
            <div className="flex-1 px-6 py-4 text-sm text-foreground-muted">
              Betalt {formatKroner(450)} · Påmeldt 3. juli
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="secondary" className="w-full">
                  Lukk
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </PreviewSection>
  );
}

function ToastsSection() {
  const [rowHidden, setRowHidden] = useState(false);

  const handleUndoToast = () => {
    setRowHidden(true);
    toast('Påmeldingen er slettet', {
      action: {
        label: 'Angre',
        onClick: () => setRowHidden(false),
      },
    });
  };

  return (
    <PreviewSection
      label="Toasts"
      description="Ekte Sonner-toasts. Toaster er montert globalt i App.tsx, så toastene vises nederst på skjermen."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => toast.success('Kurset er publisert')}>
            toast.success
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.error(friendlyError(new Error('network'), 'Kunne ikke publisere kurset'))}
          >
            toast.error
          </Button>
          <Button variant="secondary" onClick={() => toast('Endringene er lagret som utkast')}>
            toast (nøytral)
          </Button>
          <Button variant="secondary" onClick={handleUndoToast}>
            toast med Angre-handling
          </Button>
        </div>
        {rowHidden ? (
          <p className="text-sm text-foreground-muted">
            Raden er fjernet — klikk «Angre» i toasten for å gjenopprette den.
          </p>
        ) : null}
      </div>
    </PreviewSection>
  );
}

export default function PrimitivesPreview() {
  return (
    <DevPage
      title="Primitiver"
      description="Ekte UI-primitiver — Button, Badge, Switch/Checkbox/RadioGroup, Dialog, AlertDialog, ConfirmDialog, Drawer, Sheet og Sonner-toasts — i alle varianter og interaktive tilstander."
    >
      <ButtonsSection />
      <BadgesSection />
      <TogglesSection />
      <DialogsSection />
      <PanelsSection />
      <ToastsSection />
    </DevPage>
  );
}
