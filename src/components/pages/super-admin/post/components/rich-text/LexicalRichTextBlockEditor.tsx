import type { PostRichTextBlock } from '@/services/posts';
import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';

import { AutoLinkNode, LinkNode } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import LexicalRichTextToolbar from '@/components/pages/super-admin/post/components/rich-text/LexicalRichTextToolbar';
import { $getRoot, ParagraphNode, type EditorState } from 'lexical';
import { useMemo } from 'react';

interface LexicalRichTextBlockEditorProps {
  block: PostRichTextBlock;
  onChange: (block: PostRichTextBlock) => void;
}

const theme = {
  heading: {
    h1: 'text-3xl font-bold text-slate-950',
    h2: 'text-2xl font-bold text-slate-950',
    h3: 'text-xl font-bold text-slate-950',
    h4: 'text-lg font-bold text-slate-950',
    h5: 'text-base font-bold text-slate-950',
    h6: 'text-sm font-bold uppercase text-slate-950',
  },
  list: {
    listitem: 'text-base leading-7',
    ul: 'list-disc space-y-2 pl-6 text-base leading-7',
  },
  paragraph: 'text-base leading-7',
  quote: 'border-l-4 border-slate-300 pl-4 text-slate-600',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline underline-offset-4',
  },
};

export default function LexicalRichTextBlockEditor({
  block,
  onChange,
}: LexicalRichTextBlockEditorProps) {
  const initialConfig = useMemo(
    () => ({
      namespace: `post-rich-text-${block.id}`,
      nodes: [
        ParagraphNode,
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        TableNode,
        TableRowNode,
        TableCellNode,
      ],
      onError(error: Error) {
        throw error;
      },
      theme,
      ...(block.editorState ? { editorState: block.editorState } : {}),
    }),
    [block.editorState, block.id],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
        <LexicalRichTextToolbar />
        <div className="relative min-h-96">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-96 px-4 py-3 text-base text-slate-950 outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-4 top-3 text-sm font-medium text-slate-400">
                Nội dung bài viết
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin
          onChange={(editorState) => {
            onChange({
              ...block,
              editorState: JSON.stringify(editorState.toJSON()),
              text: getPlainText(editorState),
            });
          }}
        />
      </div>
    </LexicalComposer>
  );
}

function getPlainText(editorState: EditorState) {
  return editorState.read(() => $getRoot().getTextContent().trim());
}
