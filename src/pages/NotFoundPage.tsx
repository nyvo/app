import { Link } from 'react-router-dom';
import { PageState } from '@/components/page-state/page-state';
import { Button } from '@/components/ui/button';

// Top-level 404: unlike slug-scoped misses (unknown studio/course), the app
// root is always a useful destination — so this variant gets an action.
const NotFoundPage = () => (
  <PageState
    variant="generic"
    action={
      <Button asChild>
        <Link to="/">Til forsiden</Link>
      </Button>
    }
  />
);

export default NotFoundPage;
