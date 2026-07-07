import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ImageField } from './image-upload'

// jsdom has no object-URL impl; ImageField creates one for the local preview.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

function pickFile(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['x'], 'photo.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

const srcOf = (container: HTMLElement) =>
  container.querySelector('img')?.getAttribute('src')

describe('ImageField — instant-save preview lifecycle', () => {
  it('shows the local preview immediately after a file is picked', () => {
    const { container } = render(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} />,
    )
    pickFile(container)
    expect(srcOf(container)).toBe('blob:preview')
  })

  it('keeps showing the preview while the save is in flight (loading)', () => {
    const { container, rerender } = render(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={false} />,
    )
    pickFile(container)
    rerender(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={true} />,
    )
    expect(srcOf(container)).toBe('blob:preview')
  })

  it('falls back to the NEW value when a save succeeds (loading true → false)', () => {
    const { container, rerender } = render(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={false} />,
    )
    pickFile(container)
    rerender(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={true} />,
    )
    // Upload resolved: parent swaps value to the saved URL and clears loading.
    rerender(
      <ImageField value="https://cdn/new.png" onChange={vi.fn()} onRemove={vi.fn()} loading={false} />,
    )
    expect(srcOf(container)).toBe('https://cdn/new.png')
  })

  it('falls back to the OLD value when a save fails (value unchanged on settle)', () => {
    const { container, rerender } = render(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={false} />,
    )
    pickFile(container)
    rerender(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={true} />,
    )
    // Upload rejected: loading clears but value never changed — no stale preview.
    rerender(
      <ImageField value="https://cdn/old.png" onChange={vi.fn()} onRemove={vi.fn()} loading={false} />,
    )
    expect(srcOf(container)).toBe('https://cdn/old.png')
  })

  it('forwards the picked file to onChange exactly once', () => {
    const onChange = vi.fn()
    const { container } = render(
      <ImageField value={null} onChange={onChange} onRemove={vi.fn()} />,
    )
    const file = pickFile(container)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(file)
  })
})

describe('ImageField — file type validation', () => {
  it('shows the accepted-formats message and does not call onChange for a rejected type', () => {
    const onChange = vi.fn()
    const { container, getByText } = render(
      <ImageField value={null} onChange={onChange} onRemove={vi.fn()} />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(getByText('Bildet kan ikke brukes. Bruk JPG, PNG eller WebP.')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
