import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { DevPage } from './_kit';

/**
 * Auth-free preview of the Studio "copy embed code" section, so it can be
 * screenshotted without logging in. Injects a fake slug. No error state:
 * EmbedCodeSection has no data fetching of its own — it renders the given
 * slug into static snippets, so there's nothing that can fail.
 */
const EmbedCodePreview = () => (
  <DevPage title="Embed-kode (studio)">
    <div className="mx-auto max-w-2xl">
      <EmbedCodeSection slug="mock-studio" />
    </div>
  </DevPage>
);

export default EmbedCodePreview;
