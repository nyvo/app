import * as React from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

import { cn } from '@/lib/utils';
import {
  List as ListIcon,
  Redo2,
  Undo2,
} from '@/lib/icons';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  className?: string;
  'aria-labelledby'?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors duration-150 ease-out',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
        'disabled:pointer-events-none disabled:opacity-40',
        'aria-pressed:bg-muted aria-pressed:text-foreground',
        '[&_svg]:size-4',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-1.5 py-1">
      <ToolbarButton
        label="Fet"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="text-sm font-semibold leading-none">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="Punktliste"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Angre"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        label="Gjør om"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  id,
  className,
  'aria-labelledby': ariaLabelledBy,
}: RichTextEditorProps) {
  const editor = useEditor({
    // Avoid TipTap's StrictMode double-mount crash ("reading 'cached'") — let
    // the editor mount after the first paint instead of synchronously.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        italic: false,
        heading: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        id: id ?? '',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
        class: cn(
          'prose-editor min-h-32 px-4 py-3 outline-none',
          'text-base leading-relaxed text-foreground',
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // Tiptap returns "<p></p>" for an empty doc — normalize to "" so
      // the field reads as empty for isDirty / required checks.
      onChange(html === '<p></p>' ? '' : html);

      // When the doc is fully erased, clear ProseMirror's storedMarks so
      // the toolbar resets. Otherwise toggling Bold → typing → deleting
      // leaves Bold visually active and applies to the next character.
      if (ed.isEmpty && (ed.view.state.storedMarks?.length ?? 0) > 0) {
        queueMicrotask(() => {
          if (ed.isDestroyed) return;
          ed.view.dispatch(ed.view.state.tr.setStoredMarks(null));
        });
      }
    },
  });

  // Sync incoming value when it changes externally (e.g. reset after save).
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (current === next) return;
    if (current === '<p></p>' && next === '') return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [value, editor]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface transition-[color,border-color,box-shadow] duration-150 ease-out',
        'focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/15',
        className,
      )}
      data-slot="rich-text-editor"
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
