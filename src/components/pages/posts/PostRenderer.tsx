import type { PostContentBlock } from '@/api/posts';
import type { ReactNode } from 'react';

interface PostRendererProps {
  blocks: PostContentBlock[];
}

export default function PostRenderer({ blocks }: PostRendererProps) {
  return (
    <div className="space-y-6 text-slate-800">
      {blocks.map((block) => {
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
