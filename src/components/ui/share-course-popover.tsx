import { useState } from 'react';
import { X, Link as LinkIcon, Twitter, Linkedin, Facebook, Mail } from '@/lib/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareCoursePopoverProps {
  courseUrl: string;
  courseTitle?: string;
  children?: React.ReactNode;
}

export function ShareCoursePopover({ courseUrl, courseTitle = 'dette kurset', children }: ShareCoursePopoverProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kunne ikke kopiere lenken');
    }
  };

  const handleShare = (platform: 'twitter' | 'linkedin' | 'facebook' | 'email') => {
    const encodedUrl = encodeURIComponent(courseUrl);
    const encodedTitle = encodeURIComponent(`Se kurset: ${courseTitle}`);

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="outline-soft" size="sm">
            Del kurs
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[360px] p-0 bg-background rounded-lg border border-border overflow-hidden"
        align="start"
      >
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">Del dette kurset</h3>
              <p className="text-xs text-foreground-muted mt-1 font-normal">
                Alle med lenken kan se dette kurset.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer text-foreground-muted hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors duration-150"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Social Share Grid */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-4 gap-2">
            {/* Twitter */}
            <button
              onClick={() => handleShare('twitter')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-muted border border-border rounded-lg group-hover:bg-background transition-colors duration-150">
                <Twitter className="size-4 text-foreground-muted group-hover:text-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground-muted group-hover:text-foreground-muted">
                Twitter
              </span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleShare('linkedin')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-muted border border-border rounded-lg group-hover:bg-background transition-colors duration-150">
                {/* Brand color: LinkedIn blue */}
                <Linkedin className="size-4 text-foreground-muted group-hover:text-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground-muted group-hover:text-foreground-muted">
                LinkedIn
              </span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => handleShare('facebook')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-muted border border-border rounded-lg group-hover:bg-background transition-colors duration-150">
                {/* Brand color: Facebook blue */}
                <Facebook className="size-4 text-foreground-muted group-hover:text-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground-muted group-hover:text-foreground-muted">
                Facebook
              </span>
            </button>

            {/* Email */}
            <button
              onClick={() => handleShare('email')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-muted border border-border rounded-lg group-hover:bg-background transition-colors duration-150">
                <Mail className="size-4 text-foreground-muted group-hover:text-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground-muted group-hover:text-foreground-muted">
                E-post
              </span>
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-border my-1" />

        {/* Copy Link Section */}
        <div className="px-6 py-4">
          <label className="text-xs font-medium text-foreground-muted mb-2 block">Kurslenke</label>
          <div className="flex items-center gap-2 p-1.5 bg-muted border border-border rounded-md focus-within:ring-2 focus-within:ring-foreground/15 transition-colors duration-150">
            <div className="pl-2 text-foreground-muted">
              <LinkIcon className="size-3.5" />
            </div>
            <input
              type="text"
              value={courseUrl}
              readOnly
              className="bg-transparent border-none text-xs text-foreground-muted w-full focus:ring-0 px-1 py-1 truncate select-all outline-none"
            />
            <button
              onClick={handleCopy}
              className={`cursor-pointer flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 shrink-0 ${
                copied
                  ? 'bg-success-subtle border-transparent text-success'
                  : 'bg-background border-border hover:bg-muted text-foreground-muted'
              }`}
            >
              {copied ? (
                <span className="text-success">Kopiert</span>
              ) : (
                <span>Kopier</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer - Access Info */}
        <div className="bg-background border-t border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">Offentlig tilgjengelig</span>
          </div>

          <Button variant="ghost" size="xs">
            Innstillinger
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
