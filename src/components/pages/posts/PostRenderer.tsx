import type { PostContentBlock } from '@/api/posts';

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
                {block.text}
              </h1>
            );
          }

          if (block.level === 2) {
            return (
              <h2 key={block.id} className={className}>
                {block.text}
              </h2>
            );
          }

          return (
            <h3 key={block.id} className={className}>
              {block.text}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={block.id} className="list-disc space-y-2 pl-6 text-base leading-7">
              {block.items.map((item, index) => (
                <li key={`${block.id}-${index}`}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'image') {
          return (
            <figure key={block.id} className="space-y-2">
              <img
                src={block.url}
                alt={block.alt}
                className="max-h-140 w-full rounded-lg object-cover"
                loading="lazy"
              />
              {block.caption ? (
                <figcaption className="text-center text-sm font-medium text-slate-500">
                  {block.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        return (
          <p key={block.id} className="whitespace-pre-line text-base leading-7">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
