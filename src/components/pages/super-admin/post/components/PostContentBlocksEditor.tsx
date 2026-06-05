import PostRenderer from '@/components/pages/posts/PostRenderer';
import PostBlockEditor from '@/components/pages/super-admin/post/components/PostBlockEditor';
import {
  type DraftBlock,
  type DraftBlockType,
  type DropPosition,
  reorderBlocks,
} from '@/components/pages/super-admin/post/utils/postFormUtils';
import Sharingan from '@/components/shared/loading/Sharingan';
import { Eye, ImagePlus, Newspaper, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactElement } from 'react';

interface PostContentBlocksEditorProps {
  blocks: DraftBlock[];
  isEditing: boolean;
  isPreviewing: boolean;
  isSaving: boolean;
  onAddBlock: (type: DraftBlockType) => void;
  onChangeBlock: (blockId: string, block: DraftBlock) => void;
  onChangeBlocks: (blocks: DraftBlock[]) => void;
  onDeleteCurrentPost: () => void;
  onRemoveBlock: (blockId: string) => void;
  onTogglePreview: () => void;
}

export default function PostContentBlocksEditor({
  blocks,
  isEditing,
  isPreviewing,
  isSaving,
  onAddBlock,
  onChangeBlock,
  onChangeBlocks,
  onDeleteCurrentPost,
  onRemoveBlock,
  onTogglePreview,
}: PostContentBlocksEditorProps) {
  const [draggedBlockId, setDraggedBlockId] = useState('');
  const [dragTarget, setDragTarget] = useState<{
    blockId: string;
    position: DropPosition;
  } | null>(null);
  const { stopAutoScroll, updateAutoScrollSpeed } = useDragAutoScroll(Boolean(draggedBlockId));

  function handleBlockDragStart(event: DragEvent<HTMLButtonElement>, blockId: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', blockId);
    setDraggedBlockId(blockId);
  }

  function handleBlockDragOver(event: DragEvent<HTMLDivElement>, targetBlockId: string) {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateAutoScrollSpeed(event.clientY);
    setDragTarget({
      blockId: targetBlockId,
      position: getDropPosition(event),
    });
  }

  function handleBlockDrop(event: DragEvent<HTMLDivElement>, targetBlockId: string) {
    const sourceBlockId = event.dataTransfer.getData('text/plain') || draggedBlockId;

    if (!sourceBlockId || sourceBlockId === targetBlockId) {
      handleBlockDragEnd();
      return;
    }

    event.preventDefault();
    onChangeBlocks(reorderBlocks(blocks, sourceBlockId, targetBlockId, getDropPosition(event)));
    handleBlockDragEnd();
  }

  function handleBlockDragEnd() {
    setDraggedBlockId('');
    setDragTarget(null);
    stopAutoScroll();
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {isEditing ? (
          <button
            type="button"
            onClick={onDeleteCurrentPost}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 px-4 text-sm font-bold text-red-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Xóa bài viết
          </button>
        ) : null}

        <button
          type="button"
          onClick={onTogglePreview}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100"
        >
          <Eye className="h-4 w-4" />
          {isPreviewing ? 'Soạn thảo' : 'Xem trước'}
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 text-sm font-bold text-sky-800 shadow-sm transition-colors hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {isSaving ? <Sharingan size={16} /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Đang lưu' : isEditing ? 'Lưu thay đổi' : 'Tạo bài viết'}
        </button>
      </div>

      {isPreviewing ? (
        <div className="mt-5 rounded-lg border border-slate-200 p-5">
          <PostRenderer blocks={blocks} />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {blocks.map((block) => (
            <PostBlockEditor
              key={block.id}
              block={block}
              dragPosition={dragTarget?.blockId === block.id ? dragTarget.position : undefined}
              isDragging={draggedBlockId === block.id}
              onChange={(nextBlock) => onChangeBlock(block.id, nextBlock)}
              onDragEnd={handleBlockDragEnd}
              onDragOver={(event) => handleBlockDragOver(event, block.id)}
              onDragStart={(event) => handleBlockDragStart(event, block.id)}
              onDrop={(event) => handleBlockDrop(event, block.id)}
              onRemove={() => onRemoveBlock(block.id)}
            />
          ))}
        </div>
      )}

      {!isPreviewing ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <span className="text-sm font-bold text-slate-700">Thêm khối:</span>{' '}
          <div className="flex flex-wrap items-center gap-2">
            <EditorButton
              icon={<Newspaper />}
              label="Đoạn text"
              onClick={() => onAddBlock('richText')}
            />
            <EditorButton icon={<ImagePlus />} label="Ảnh" onClick={() => onAddBlock('image')} />
          </div>
        </div>
      ) : null}
    </>
  );
}

interface EditorButtonProps {
  icon: ReactElement;
  label: string;
  onClick: () => void;
}

function EditorButton({ icon, label, onClick }: EditorButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  );
}

function getDropPosition(event: DragEvent<HTMLDivElement>): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

const AUTO_SCROLL_EDGE_DISTANCE = 110;
const AUTO_SCROLL_MAX_SPEED = 22;

function getAutoScrollSpeed(distanceFromEdge: number) {
  const distanceRatio = Math.max(0, AUTO_SCROLL_EDGE_DISTANCE - distanceFromEdge);
  return Math.ceil((distanceRatio / AUTO_SCROLL_EDGE_DISTANCE) * AUTO_SCROLL_MAX_SPEED);
}

function useDragAutoScroll(isActive: boolean) {
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollSpeedRef = useRef(0);

  const stopAutoScroll = useCallback(() => {
    autoScrollSpeedRef.current = 0;

    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      return;
    }

    function runAutoScroll() {
      const scrollSpeed = autoScrollSpeedRef.current;

      if (scrollSpeed === 0) {
        stopAutoScroll();
        return;
      }

      window.scrollBy({ top: scrollSpeed });
      autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll);
    }

    autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll);
  }, [stopAutoScroll]);

  const updateAutoScrollSpeed = useCallback(
    (pointerY: number) => {
      const viewportHeight = window.innerHeight;
      const topDistance = pointerY;
      const bottomDistance = viewportHeight - pointerY;

      if (topDistance < AUTO_SCROLL_EDGE_DISTANCE) {
        autoScrollSpeedRef.current = -getAutoScrollSpeed(topDistance);
        startAutoScroll();
        return;
      }

      if (bottomDistance < AUTO_SCROLL_EDGE_DISTANCE) {
        autoScrollSpeedRef.current = getAutoScrollSpeed(bottomDistance);
        startAutoScroll();
        return;
      }

      stopAutoScroll();
    },
    [startAutoScroll, stopAutoScroll],
  );

  useEffect(() => {
    if (!isActive) {
      stopAutoScroll();
      return undefined;
    }

    function handleDocumentDragOver(event: globalThis.DragEvent) {
      updateAutoScrollSpeed(event.clientY);
    }

    document.addEventListener('dragover', handleDocumentDragOver);

    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver);
      stopAutoScroll();
    };
  }, [isActive, stopAutoScroll, updateAutoScrollSpeed]);

  return { stopAutoScroll, updateAutoScrollSpeed };
}
