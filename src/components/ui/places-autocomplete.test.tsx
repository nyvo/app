import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { PlacesAutocomplete } from './places-autocomplete'
import { searchPlaces, getPlaceDetails } from '@/services/places'

vi.mock('@/services/places', () => ({
  searchPlaces: vi.fn(),
  getPlaceDetails: vi.fn(),
}))

const mockedSearchPlaces = vi.mocked(searchPlaces)
const mockedGetPlaceDetails = vi.mocked(getPlaceDetails)

function ControlledAutocomplete() {
  const [value, setValue] = useState('')
  return (
    <PlacesAutocomplete
      value={value}
      onChange={setValue}
      onSelect={() => {}}
    />
  )
}

beforeEach(() => {
  mockedSearchPlaces.mockReset()
  mockedGetPlaceDetails.mockReset()
})

describe('PlacesAutocomplete — search failure', () => {
  it('shows the fallback message when the search errors, instead of reading as "no results"', async () => {
    mockedSearchPlaces.mockResolvedValue({ data: [], error: new Error('Søket feilet') })

    const { container, getByText } = render(<ControlledAutocomplete />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Storgata 1' } })

    await waitFor(() =>
      expect(getByText('Stedsøket er utilgjengelig. Skriv inn adressen manuelt.')).toBeInTheDocument(),
    )
  })

  it('renders results normally when the search succeeds', async () => {
    mockedSearchPlaces.mockResolvedValue({
      data: [{ placeId: '1', primary: 'Storgata 1', secondary: 'Oslo' }],
      error: null,
    })

    const { container, getByText, queryByText } = render(<ControlledAutocomplete />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Storgata 1' } })

    await waitFor(() => expect(getByText('Storgata 1')).toBeInTheDocument())
    expect(queryByText('Stedsøket er utilgjengelig. Skriv inn adressen manuelt.')).not.toBeInTheDocument()
  })
})
