import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationField } from './location-field';

vi.mock('@/components/ui/places-autocomplete', () => ({
  PlacesAutocomplete: () => <input aria-label="Sted" />,
}));

vi.mock('@/components/ui/map-embed', () => ({
  MapEmbed: () => <div data-testid="map-embed" />,
}));

describe('LocationField', () => {
  it('can hide selected-place details for compact forms', () => {
    render(
      <LocationField
        value="Fjell Yoga"
        address="Thorvald Meyers gate 45, 0555 Oslo"
        coords={{ lat: 59.923, lon: 10.759, placeId: 'place-1' }}
        showSelectionDetails={false}
        onChange={() => {}}
      />,
    );

    expect(screen.queryByText('Thorvald Meyers gate 45, 0555 Oslo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-embed')).not.toBeInTheDocument();
  });
});
