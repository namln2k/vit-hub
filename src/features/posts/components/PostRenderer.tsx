import type { PostContentBlock } from '@/services/posts';
import type { CSSProperties, ReactNode } from 'react';

interface PostRendererProps {
  blocks: PostContentBlock[];
}

export default function PostRenderer({ blocks }: PostRendererProps) {
  return (
    <div className="space-y-6 text-slate-800">
      {blocks.map((block) => {
        if (block.type === 'richText') {
          return (
            <div key={block.id} className="space-y-4">
              {renderLexicalContent(block.editorState)}
            </div>
          );
        }

        if (block.type === 'heading') {
          const className =
            block.level === 1
              ? 'text-3xl font-bold text-slate-950'
              : block.level === 2
                ? 'text-2xl font-bold text-slate-950'
                : 'text-xl font-bold text-slate-950';

          if (block.level === 1) {
            return (
              <h1 key={block.id} className={className}>
                {renderLinkedText(block.text)}
              </h1>
            );
          }

          if (block.level === 2) {
            return (
              <h2 key={block.id} className={className}>
                {renderLinkedText(block.text)}
              </h2>
            );
          }

          return (
            <h3 key={block.id} className={className}>
              {renderLinkedText(block.text)}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={block.id} className="list-disc space-y-2 pl-6 text-base leading-7">
              {block.items.map((item, index) => (
                <li key={`${block.id}-${index}`}>{renderLinkedText(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'image') {
          const imageLinkUrl = block.linkUrl?.trim();
          const image = (
            <img
              src={block.url}
              alt={block.alt}
              className="max-h-140 w-full rounded-lg object-cover"
              loading="lazy"
            />
          );

          return (
            <figure key={block.id} className="space-y-2">
              {imageLinkUrl ? (
                <a
                  href={normalizeLinkHref(imageLinkUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg outline-none ring-violet-400 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {image}
                </a>
              ) : (
                image
              )}
              {block.caption ? (
                <figcaption className="text-center text-sm font-medium text-slate-500">
                  {renderLinkedText(block.caption)}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        return (
          <p key={block.id} className="whitespace-pre-line text-base leading-7">
            {renderLinkedText(block.text)}
          </p>
        );
      })}
    </div>
  );
}

const LINK_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_LINK_PUNCTUATION_PATTERN = /[.,!?;:]+$/;

function renderLinkedText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;
    const displayUrl = rawUrl.replace(TRAILING_LINK_PUNCTUATION_PATTERN, '');
    const trailingText = rawUrl.slice(displayUrl.length);

    if (!displayUrl) {
      continue;
    }

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    parts.push(
      <a
        key={`${displayUrl}-${matchIndex}`}
        href={normalizeLinkHref(displayUrl)}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-4 transition-colors hover:text-violet-900 hover:decoration-violet-500"
      >
        {displayUrl}
      </a>,
    );

    if (trailingText) {
      parts.push(trailingText);
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (parts.length === 0) {
    return text;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function normalizeLinkHref(url: string) {
  const trimmedUrl = url.trim();
  return trimmedUrl.startsWith('www.') ? `https://${trimmedUrl}` : trimmedUrl;
}

interface SerializedLexicalRoot {
  root?: {
    children?: SerializedLexicalNode[];
  };
}

interface SerializedLexicalNode {
  children?: SerializedLexicalNode[];
  direction?: string | null;
  format?: number | string;
  indent?: number;
  listType?: string;
  tag?: string;
  style?: string;
  text?: string;
  type?: string;
}

const TEXT_FORMAT_BOLD = 1;
const TEXT_FORMAT_ITALIC = 2;
const TEXT_FORMAT_UNDERLINE = 8;

function renderLexicalContent(editorState: string) {
  if (!editorState) {
    return null;
  }

  try {
    const parsed = JSON.parse(editorState) as SerializedLexicalRoot;
    const children = parsed.root?.children ?? [];

    return children.map((node, index) => renderLexicalNode(node, `rich-text-${index}`));
  } catch {
    return null;
  }
}

function renderLexicalNode(node: SerializedLexicalNode, key: string): ReactNode {
  const children = renderLexicalChildren(node, key);

  if (node.type === 'heading') {
    const tag = getLexicalHeadingTag(node.tag);
    const className = getLexicalHeadingClassName(tag);

    if (tag === 'h1') {
      return (
        <h1 key={key} className={className}>
          {children}
        </h1>
      );
    }

    if (tag === 'h3') {
      return (
        <h3 key={key} className={className}>
          {children}
        </h3>
      );
    }

    if (tag === 'h4') {
      return (
        <h4 key={key} className={className}>
          {children}
        </h4>
      );
    }

    if (tag === 'h5') {
      return (
        <h5 key={key} className={className}>
          {children}
        </h5>
      );
    }

    if (tag === 'h6') {
      return (
        <h6 key={key} className={className}>
          {children}
        </h6>
      );
    }

    return (
      <h2 key={key} className={className}>
        {children}
      </h2>
    );
  }

  if (node.type === 'list') {
    return (
      <ul key={key} className="list-disc space-y-2 pl-6 text-base leading-7">
        {children}
      </ul>
    );
  }

  if (node.type === 'listitem') {
    return <li key={key}>{children}</li>;
  }

  if (node.type === 'quote') {
    return (
      <blockquote key={key} className="border-l-4 border-slate-300 pl-4 text-slate-600">
        {children}
      </blockquote>
    );
  }

  if (node.type === 'text') {
    return renderFormattedLexicalText(node, key);
  }

  if (node.type === 'linebreak') {
    return <br key={key} />;
  }

  return (
    <p key={key} className="whitespace-pre-line text-base leading-7">
      {children}
    </p>
  );
}

function renderLexicalChildren(node: SerializedLexicalNode, key: string) {
  return (node.children ?? []).map((child, index) => renderLexicalNode(child, `${key}-${index}`));
}

function renderFormattedLexicalText(node: SerializedLexicalNode, key: string): ReactNode {
  let content: ReactNode = renderLinkedText(node.text ?? '');
  const style = parseLexicalTextStyle(node.style);

  if (typeof node.format === 'number') {
    if ((node.format & TEXT_FORMAT_UNDERLINE) !== 0) {
      content = (
        <span key={`${key}-underline`} className="underline underline-offset-4">
          {content}
        </span>
      );
    }

    if ((node.format & TEXT_FORMAT_ITALIC) !== 0) {
      content = <em key={`${key}-italic`}>{content}</em>;
    }

    if ((node.format & TEXT_FORMAT_BOLD) !== 0) {
      content = <strong key={`${key}-bold`}>{content}</strong>;
    }
  }

  return (
    <span key={key} style={style}>
      {content}
    </span>
  );
}

type LexicalHeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

function getLexicalHeadingTag(tag: string | undefined): LexicalHeadingTag {
  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
    return tag;
  }

  return 'h2';
}

function getLexicalHeadingClassName(tag: LexicalHeadingTag) {
  if (tag === 'h1') {
    return 'text-3xl font-bold text-slate-950';
  }

  if (tag === 'h2') {
    return 'text-2xl font-bold text-slate-950';
  }

  if (tag === 'h3') {
    return 'text-xl font-bold text-slate-950';
  }

  if (tag === 'h4') {
    return 'text-lg font-bold text-slate-950';
  }

  if (tag === 'h5') {
    return 'text-base font-bold text-slate-950';
  }

  return 'text-sm font-bold uppercase text-slate-950';
}

function parseLexicalTextStyle(style: string | undefined): CSSProperties | undefined {
  if (!style) {
    return undefined;
  }

  const nextStyle: CSSProperties = {};

  for (const declaration of style.split(';')) {
    const [property, rawValue] = declaration.split(':').map((part) => part.trim());

    if (!property || !rawValue) {
      continue;
    }

    if (property === 'font-size' && isAllowedFontSize(rawValue)) {
      nextStyle.fontSize = rawValue;
    }

    if (property === 'color' && isAllowedColor(rawValue)) {
      nextStyle.color = rawValue;
    }
  }

  return Object.keys(nextStyle).length > 0 ? nextStyle : undefined;
}

function isAllowedFontSize(value: string) {
  return /^\d{1,2}px$/.test(value);
}

function isAllowedColor(value: string) {
  return (
    /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value) ||
    /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(value) ||
    /^[a-z]+$/i.test(value)
  );
}
