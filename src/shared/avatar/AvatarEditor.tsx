import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface AvatarEditorProps {
  file: File;
  onCancel: () => void;
  onSave: (file: File) => void | Promise<void>;
  saving?: boolean;
}

interface ImageSize {
  width: number;
  height: number;
}

const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;
const OUTPUT_TYPE = 'image/webp';
const OUTPUT_QUALITY = 0.82;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getEditedAvatarName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'avatar';
  return `${baseName}-avatar.webp`;
}

export default function AvatarEditor({
  file,
  onCancel,
  onSave,
  saving = false,
}: AvatarEditorProps) {
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let isActive = true;
    const reader = new FileReader();

    reader.onloadstart = () => {
      if (isActive) {
        setImageUrl('');
        setImageSize(null);
      }
    };
    reader.onload = () => {
      if (isActive && typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.onerror = () => {
      if (isActive) {
        setError('Không thể đọc ảnh đã chọn.');
      }
    };
    reader.readAsDataURL(file);

    return () => {
      isActive = false;
      reader.abort();
    };
  }, [file]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, saving]);

  const baseScale = imageSize
    ? Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height)
    : 1;
  const displayWidth = imageSize ? imageSize.width * baseScale * zoom : PREVIEW_SIZE;
  const displayHeight = imageSize ? imageSize.height * baseScale * zoom : PREVIEW_SIZE;
  const maxOffsetX = Math.max(0, (displayWidth - PREVIEW_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - PREVIEW_SIZE) / 2);
  const boundedOffset = {
    x: clamp(offset.x, -maxOffsetX, maxOffsetX),
    y: clamp(offset.y, -maxOffsetY, maxOffsetY),
  };

  function updateZoom(nextZoom: number) {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    setZoom(clampedZoom);
    setOffset((currentOffset) => {
      if (!imageSize) {
        return currentOffset;
      }

      const nextDisplayWidth = imageSize.width * baseScale * clampedZoom;
      const nextDisplayHeight = imageSize.height * baseScale * clampedZoom;
      const nextMaxOffsetX = Math.max(0, (nextDisplayWidth - PREVIEW_SIZE) / 2);
      const nextMaxOffsetY = Math.max(0, (nextDisplayHeight - PREVIEW_SIZE) / 2);

      return {
        x: clamp(currentOffset.x, -nextMaxOffsetX, nextMaxOffsetX),
        y: clamp(currentOffset.y, -nextMaxOffsetY, nextMaxOffsetY),
      };
    });
  }

  function handleImageLoad() {
    const image = imageRef.current;

    if (!image) {
      return;
    }

    setImageSize({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (saving) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: boundedOffset.x,
      offsetY: boundedOffset.y,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: clamp(dragStart.offsetX + event.clientX - dragStart.x, -maxOffsetX, maxOffsetX),
      y: clamp(dragStart.offsetY + event.clientY - dragStart.y, -maxOffsetY, maxOffsetY),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  }

  function resetEditor() {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  async function createEditedAvatar() {
    const image = imageRef.current;

    if (!image || !imageSize) {
      throw new Error('Ảnh chưa sẵn sàng để chỉnh.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Trình duyệt không hỗ trợ chỉnh ảnh.');
    }

    const outputScale = Math.max(OUTPUT_SIZE / imageSize.width, OUTPUT_SIZE / imageSize.height);
    const scaledWidth = imageSize.width * outputScale * zoom;
    const scaledHeight = imageSize.height * outputScale * zoom;
    const outputOffsetScale = OUTPUT_SIZE / PREVIEW_SIZE;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      (OUTPUT_SIZE - scaledWidth) / 2 + boundedOffset.x * outputOffsetScale,
      (OUTPUT_SIZE - scaledHeight) / 2 + boundedOffset.y * outputOffsetScale,
      scaledWidth,
      scaledHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
    });

    if (!blob) {
      throw new Error('Không thể tạo ảnh đại diện đã chỉnh.');
    }

    return new File([blob], getEditedAvatarName(file.name), {
      type: OUTPUT_TYPE,
      lastModified: Date.now(),
    });
  }

  async function handleSave() {
    try {
      setError('');
      const editedAvatar = await createEditedAvatar();
      await onSave(editedAvatar);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu ảnh đã chỉnh.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-editor-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="avatar-editor-title" className="text-base font-semibold text-gray-900">
            Căn chỉnh ảnh đại diện
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex justify-center">
            <div
              className="relative h-64 w-64 touch-none overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {imageUrl && (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt=""
                  draggable={false}
                  onLoad={handleImageLoad}
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    transform: `translate(calc(-50% + ${boundedOffset.x}px), calc(-50% + ${boundedOffset.y}px))`,
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/80" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateZoom(zoom - ZOOM_STEP)}
              disabled={saving || zoom <= MIN_ZOOM}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Thu nhỏ"
              aria-label="Thu nhỏ"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(event) => updateZoom(Number(event.target.value))}
              disabled={saving}
              className="w-full accent-indigo-600"
              aria-label="Phóng to ảnh"
            />
            <button
              type="button"
              onClick={() => updateZoom(zoom + ZOOM_STEP)}
              disabled={saving || zoom >= MAX_ZOOM}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Phóng to"
              aria-label="Phóng to"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetEditor}
              disabled={saving}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Đặt lại"
              aria-label="Đặt lại"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !imageSize}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
}
