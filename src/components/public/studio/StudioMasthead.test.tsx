import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudioMasthead } from './StudioMasthead';
import type { StudioLocation } from './studioFacts';
import type { PublicSeller } from '@/services/sellers';

const organization: PublicSeller = {
  id: 'seller-1',
  name: 'Fjell Yoga Oslo',
  slug: 'fjell-yoga',
  logo_url: null,
  cover_image_url: null,
  default_course_image_url: null,
  stripe_onboarding_complete: true,
};

function renderLocation(location: StudioLocation) {
  return render(<StudioMasthead organization={organization} location={location} />);
}

describe('StudioMasthead location', () => {
  it('shows a selected street address once on a single identity line', () => {
    renderLocation({
      label: 'Thorvald Meyers gate 45',
      address: 'Thorvald Meyers gate 45, 0555 Oslo',
      lat: 59.923,
      lon: 10.759,
      placeId: 'street-place',
    });

    expect(screen.queryByText('Thorvald Meyers gate 45')).not.toBeInTheDocument();
    expect(screen.getByText('Thorvald Meyers gate 45, 0555 Oslo')).toBeInTheDocument();
  });

  it('drops a venue label that just repeats the studio name', () => {
    renderLocation({
      label: 'Fjell Yoga Oslo',
      address: 'Thorvald Meyers gate 45, 0555 Oslo',
      lat: 59.923,
      lon: 10.759,
      placeId: 'studio-place',
    });

    // The H1 carries the name; the identity block must not repeat it.
    expect(screen.getAllByText('Fjell Yoga Oslo')).toHaveLength(1);
    expect(screen.getByText('Thorvald Meyers gate 45, 0555 Oslo')).toBeInTheDocument();
  });

  it('renders no cover band when the seller has no cover image', () => {
    const { container } = renderLocation({
      label: 'Fjell Yoga',
      address: 'Thorvald Meyers gate 45, 0555 Oslo',
      lat: 59.923,
      lon: 10.759,
      placeId: 'business-place',
    });

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-muted.h-44')).not.toBeInTheDocument();
  });

  it('keeps a business name above its street address', () => {
    renderLocation({
      label: 'Fjell Yoga',
      address: 'Thorvald Meyers gate 45, 0555 Oslo',
      lat: 59.923,
      lon: 10.759,
      placeId: 'business-place',
    });

    expect(screen.getByText('Fjell Yoga')).toBeInTheDocument();
    expect(screen.getByText('Thorvald Meyers gate 45, 0555 Oslo')).toBeInTheDocument();
  });
});
