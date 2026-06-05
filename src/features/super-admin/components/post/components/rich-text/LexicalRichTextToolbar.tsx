import { INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import { $patchStyleText, $setBlocksType } from '@lexical/selection';
import {
  $getSelection,
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
} from 'lexical';
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';
import { Baseline, Bold, Italic, List, Palette, Redo2, SmilePlus, Type, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

const HEADING_OPTIONS: HeadingTagType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const FONT_SIZE_OPTIONS = ['14px', '16px', '18px', '20px', '24px', '30px', '36px'];
const TEXT_COLOR_OPTIONS = [
  '#0f172a',
  '#475569',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
];

export default function LexicalRichTextToolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-2">
      <ToolbarSelect
        icon={<Type className="h-4 w-4" />}
        label="Kiểu chữ"
        value=""
        onChange={(value) => setHeading(editor, value as HeadingTagType)}
      >
        <option value="" disabled>
          Kiểu chữ
        </option>
        {HEADING_OPTIONS.map((heading) => (
          <option key={heading} value={heading}>
            {heading.toUpperCase()}
          </option>
        ))}
      </ToolbarSelect>
      <ToolbarSelect
        icon={<Baseline className="h-4 w-4" />}
        label="Cỡ chữ"
        value=""
        onChange={(value) => patchSelectionStyle(editor, { 'font-size': value })}
      >
        <option value="" disabled>
          Cỡ chữ
        </option>
        {FONT_SIZE_OPTIONS.map((fontSize) => (
          <option key={fontSize} value={fontSize}>
            {fontSize}
          </option>
        ))}
      </ToolbarSelect>
      <ToolbarDivider />
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label="Đậm"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        label="Nghiêng"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      />
      <ToolbarDivider />
      <ToolbarColorPicker editor={editor} />
      <ToolbarDivider />
      <ToolbarEmojiPicker editor={editor} />
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        label="Bullet"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      />
      <ToolbarDivider />
      <ToolbarButton
        icon={<Undo2 className="h-4 w-4" />}
        label="Hoàn tác"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      />
      <ToolbarButton
        icon={<Redo2 className="h-4 w-4" />}
        label="Làm lại"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  icon: ReactElement;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <ToolbarTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
      >
        {icon}
      </button>
    </ToolbarTooltip>
  );
}

interface ToolbarSelectProps {
  children: ReactNode;
  icon: ReactElement;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ToolbarSelect({ children, icon, label, value, onChange }: ToolbarSelectProps) {
  return (
    <ToolbarTooltip label={label}>
      <label className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700 focus-within:border-violet-500">
        {icon}
        <select
          aria-label={label}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            event.target.value = '';
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {children}
        </select>
      </label>
    </ToolbarTooltip>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px bg-slate-200" />;
}

interface ToolbarColorPickerProps {
  editor: LexicalEditor;
}

function ToolbarColorPicker({ editor }: ToolbarColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleDocumentClick(event: globalThis.MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isOpen]);

  function applyColor(color: string) {
    patchSelectionStyle(editor, { color });
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <ToolbarTooltip label="Màu chữ">
        <button
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-label="Màu chữ"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
        >
          <Palette className="h-4 w-4" />
        </button>
      </ToolbarTooltip>

      {isOpen ? (
        <div className="absolute left-0 top-10 z-20 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-4 gap-2">
            {TEXT_COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => applyColor(color)}
                aria-label={`Chọn màu ${color}`}
                className="h-8 rounded-md border border-slate-200 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-400"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition-colors hover:border-violet-300 hover:bg-white hover:text-violet-700"
          >
            Màu khác
          </button>
          <input
            ref={colorInputRef}
            type="color"
            aria-label="Màu khác"
            defaultValue={TEXT_COLOR_OPTIONS[0]}
            onChange={(event) => applyColor(event.target.value)}
            className="sr-only"
          />
        </div>
      ) : null}
    </div>
  );
}

interface ToolbarEmojiPickerProps {
  editor: LexicalEditor;
}

function ToolbarEmojiPicker({ editor }: ToolbarEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleDocumentClick(event: globalThis.MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isOpen]);

  function insertEmoji(emojiData: EmojiClickData) {
    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, emojiData.emoji);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <ToolbarTooltip label="Icon">
        <button
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-label="Icon"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
        >
          <SmilePlus className="h-4 w-4" />
        </button>
      </ToolbarTooltip>

      {isOpen ? (
        <div className="absolute left-0 top-10 z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <EmojiPicker
            height={360}
            onEmojiClick={insertEmoji}
            previewConfig={{ showPreview: false }}
            emojiStyle={EmojiStyle.NATIVE}
            searchPlaceholder="Tìm emoji"
            theme={Theme.LIGHT}
            width={320}
          />
        </div>
      ) : null}
    </div>
  );
}

interface ToolbarTooltipProps {
  children: ReactElement;
  label: string;
}

function ToolbarTooltip({ children, label }: ToolbarTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSuppressed, setIsSuppressed] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onBlur={() => {
        setIsVisible(false);
        setIsSuppressed(false);
      }}
      onFocus={() => {
        if (!isSuppressed) {
          setIsVisible(true);
        }
      }}
      onMouseEnter={() => {
        if (!isSuppressed) {
          setIsVisible(true);
        }
      }}
      onMouseLeave={() => {
        setIsVisible(false);
        setIsSuppressed(false);
      }}
      onPointerDown={() => {
        setIsVisible(false);
        setIsSuppressed(true);
      }}
    >
      {children}
      {isVisible ? (
        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white opacity-100 shadow-lg">
          {label}
        </span>
      ) : null}
    </span>
  );
}

function setHeading(editor: LexicalEditor, heading: HeadingTagType) {
  editor.update(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createHeadingNode(heading));
    }
  });
}

function patchSelectionStyle(editor: LexicalEditor, styles: Record<string, string>) {
  editor.update(() => {
    const selection = $getSelection();

    if (selection) {
      $patchStyleText(selection, styles);
    }
  });
}
