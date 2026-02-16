import { useState } from 'react';
import { Share2, X, Link as LinkIcon, Twitter, Linkedin, Facebook, Mail, ChevronRight, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareCoursePopoverProps {
  courseUrl: string;
  courseTitle?: string;
  children?: React.ReactNode;
}

export function ShareCoursePopover({ courseUrl, courseTitle = 'this course', children }: ShareCoursePopoverProps) {
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
    const encodedTitle = encodeURIComponent(`Check out ${courseTitle}`);

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
          <Button variant="outline-soft" size="compact">
            <Share2 className="h-3.5 w-3.5" />
            Del kurs
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0 bg-white rounded-2xl border border-border overflow-hidden"
        align="start"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-primary tracking-tight">Del dette kurset</h3>
              <p className="text-xs text-text-secondary mt-1 font-normal">
                Alle med lenken kan se dette kurset.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer text-text-tertiary hover:text-text-primary hover:bg-zinc-50 p-1 rounded-lg smooth-transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Social Share Grid */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-4 gap-2">
            {/* Twitter */}
            <button
              onClick={() => handleShare('twitter')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-zinc-50 smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-surface-elevated border border-border rounded-lg group-hover:bg-white group-hover:border-ring smooth-transition">
                <Twitter className="h-4 w-4 text-text-secondary group-hover:text-text-primary stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-text-secondary group-hover:text-text-secondary">
                Twitter
              </span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleShare('linkedin')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-zinc-50 smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-surface-elevated border border-border rounded-lg group-hover:bg-white group-hover:border-ring smooth-transition">
                <Linkedin className="h-4 w-4 text-text-secondary group-hover:text-blue-600 stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-text-secondary group-hover:text-text-secondary">
                LinkedIn
              </span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => handleShare('facebook')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-zinc-50 smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-surface-elevated border border-border rounded-lg group-hover:bg-white group-hover:border-ring smooth-transition">
                <Facebook className="h-4 w-4 text-text-secondary group-hover:text-blue-500 stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-text-secondary group-hover:text-text-secondary">
                Facebook
              </span>
            </button>

            {/* Email */}
            <button
              onClick={() => handleShare('email')}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-zinc-50 smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-surface-elevated border border-border rounded-lg group-hover:bg-white group-hover:border-ring smooth-transition">
                <Mail className="h-4 w-4 text-text-secondary group-hover:text-text-primary stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-text-secondary group-hover:text-text-secondary">
                E-post
              </span>
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-border my-1" />

        {/* Copy Link Section */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-text-secondary mb-2 block">Kurslenke</label>
          <div className="flex items-center gap-2 p-1.5 bg-surface-elevated border border-border rounded-lg focus-within:ring-2 focus-within:ring-zinc-400/50 focus-within:ring-offset-2 focus-within:ring-offset-white smooth-transition">
            <div className="pl-2 text-text-tertiary">
              <LinkIcon className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              value={courseUrl}
              readOnly
              className="bg-transparent border-none text-xs text-text-secondary w-full focus:ring-0 px-1 py-1 font-mono truncate select-all outline-none"
            />
            <button
              onClick={handleCopy}
              className={`cursor-pointer flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-medium smooth-transition shrink-0 ${
                copied
                  ? 'bg-status-confirmed-bg border-status-confirmed-border text-status-confirmed-text'
                  : 'bg-white border-border hover:border-ring hover:bg-zinc-50 text-text-secondary'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-status-confirmed-text" />
                  <span className="text-status-confirmed-text">Kopiert</span>
                </>
              ) : (
                <span>Kopier</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer - Access Info */}
        <div className="bg-surface border-t border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Offentlig tilgjengelig</span>
          </div>

          <button className="cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors">
            Innstillinger
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
