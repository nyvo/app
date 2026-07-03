import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';

/**
 * Auth-free preview of the Studio "copy embed code" section, so it can be
 * screenshotted without logging in. Injects a fake slug.
 */
const EmbedCodePreview = () => (
  <div className="min-h-screen bg-background text-foreground py-12">
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
      <EmbedCodeSection slug="mock-studio" />
    </div>
  </div>
);

export default EmbedCodePreview;
