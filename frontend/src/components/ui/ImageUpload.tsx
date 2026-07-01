import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// =============================================================================
// Types
// =============================================================================

export interface ImageUploadProps {
    /**
     * The current image URL (controlled value).
     * Pass the URL returned by the upload API, or an existing image URL
     * when editing a record.
     */
    value?: string;

    /**
     * Called when the upload succeeds with the resulting URL,
     * or called with `undefined` when the image is removed.
     *
     * Wire this to `react-hook-form`'s `Controller` onChange:
     * ```tsx
     * <Controller
     *   control={control}
     *   name="imageUrl"
     *   render={({ field }) => (
     *     <ImageUpload value={field.value} onChange={field.onChange} onUpload={...} />
     *   )}
     * />
     * ```
     */
    onChange?: (url: string | undefined) => void;

    /**
     * Called with the selected {@link File} so the parent can perform the
     * actual upload (e.g. POST to a presigned S3 URL or a backend endpoint).
     *
     * The parent resolves with the resulting public URL which is then passed
     * back via `onChange`.
     *
     * @param file - The validated file selected by the user.
     * @returns A promise that resolves to the uploaded image URL.
     */
    onUpload: (file: File) => Promise<string>;

    /** Accepted MIME types. Defaults to JPEG, PNG, WEBP. */
    accept?: string[];

    /** Maximum file size in bytes. Defaults to 5 MB. */
    maxSizeBytes?: number;

    /** Human-readable max size label shown in the error message. */
    maxSizeLabel?: string;

    /** Whether the component is in a read-only / disabled state. */
    disabled?: boolean;

    /** Optional className applied to the outer wrapper. */
    className?: string;

    /**
     * Aspect ratio of the preview area.
     * Use Tailwind aspect-ratio classes like `aspect-video` or `aspect-square`.
     * Defaults to `aspect-video` (16:9).
     */
    aspectRatio?: 'aspect-video' | 'aspect-auto' | 'aspect-square';

    /** Hint text shown inside the dropzone. */
    hint?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_LABEL = '5 MB';

// =============================================================================
// Component
// =============================================================================

/**
 * Reusable image upload component.
 *
 * Features:
 *  - Drag-and-drop or click-to-browse file selection.
 *  - Client-side file type and size validation before uploading.
 *  - Upload progress indicator.
 *  - Preview of the selected / existing image.
 *  - Remove button to clear the current image.
 *  - Full light/dark theme support.
 *  - Works seamlessly with `react-hook-form` via the `Controller` API.
 *
 * @example Used in a form with react-hook-form:
 * ```tsx
 * <Controller
 *   control={control}
 *   name="imageUrl"
 *   render={({ field, fieldState }) => (
 *     <>
 *       <ImageUpload
 *         value={field.value}
 *         onChange={field.onChange}
 *         onUpload={handleUpload}
 *         aspectRatio="aspect-video"
 *       />
 *       {fieldState.error && <p>{fieldState.error.message}</p>}
 *     </>
 *   )}
 * />
 * ```
 */
export function ImageUpload({
    value,
    onChange,
    onUpload,
    accept = DEFAULT_ACCEPT,
    maxSizeBytes = DEFAULT_MAX_BYTES,
    maxSizeLabel = DEFAULT_MAX_LABEL,
    disabled = false,
    className,
    aspectRatio = 'aspect-video',
    hint,
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [localError, setLocalError] = useState<string | null>(null);

    // -------------------------------------------------------------------------
    // File validation
    // -------------------------------------------------------------------------

    /**
     * Validates file type and size before initiating upload.
     * Returns an error message string or null if valid.
     */
    const validateFile = useCallback(
        (file: File): string | null => {
            if (!accept.includes(file.type)) {
                const labels = accept
                    .map((t) => t.split('/')[1].toUpperCase())
                    .join(', ');
                return `Invalid file type. Accepted formats: ${labels}.`;
            }
            if (file.size > maxSizeBytes) {
                return `File is too large. Maximum size is ${maxSizeLabel}.`;
            }
            return null;
        },
        [accept, maxSizeBytes, maxSizeLabel]
    );

    // -------------------------------------------------------------------------
    // Upload handler
    // -------------------------------------------------------------------------

    /**
     * Validates the file, runs the caller-supplied {@link onUpload} function,
     * and propagates the resulting URL to {@link onChange}.
     */
    const handleFile = useCallback(
        async (file: File) => {
            setLocalError(null);

            const error = validateFile(file);
            if (error) {
                setLocalError(error);
                return;
            }

            setIsUploading(true);
            setUploadProgress(0);

            // Simulate progress ticks while the real upload is in flight.
            // This gives visual feedback without needing an XHR progress event.
            const progressInterval = window.setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 150);

            try {
                const url = await onUpload(file);
                setUploadProgress(100);
                onChange?.(url);
            } catch {
                setLocalError('Upload failed. Please try again.');
                onChange?.(undefined);
            } finally {
                clearInterval(progressInterval);
                setIsUploading(false);
                setUploadProgress(0);
            }
        },
        [validateFile, onUpload, onChange]
    );

    // -------------------------------------------------------------------------
    // Input / drag-drop event handlers
    // -------------------------------------------------------------------------

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // Reset input so the same file can be re-selected after removal
        e.target.value = '';
    };

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
        },
        [disabled, isUploading, handleFile]
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!disabled && !isUploading) setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleRemove = () => {
        setLocalError(null);
        onChange?.(undefined);
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    const isInteractive = !disabled && !isUploading;
    const hasImage = Boolean(value);

    return (
        <div className={cn('space-y-2', className)}>
            <div
                className={cn(
                    'relative overflow-hidden rounded-xl border-2 transition-colors duration-200',
                    aspectRatio,
                    // Base styles
                    'bg-gray-50 dark:bg-gray-900',
                    // Border styles — drag active vs default
                    isDragging
                        ? 'border-gray-500 bg-gray-100 dark:border-gray-400 dark:bg-gray-800/60'
                        : hasImage
                          ? 'border-gray-200 dark:border-gray-800'
                          : 'border-dashed border-gray-300 dark:border-gray-700',
                    // Hover state when interactive and no image
                    !hasImage &&
                        isInteractive &&
                        'cursor-pointer hover:border-gray-400 hover:bg-gray-100/70 dark:hover:border-gray-600 dark:hover:bg-gray-800/60',
                    // Disabled opacity
                    disabled && 'cursor-not-allowed opacity-60'
                )}
                onClick={() =>
                    !hasImage && isInteractive && inputRef.current?.click()
                }
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role={!hasImage && isInteractive ? 'button' : undefined}
                aria-label={!hasImage ? 'Upload image' : undefined}
                tabIndex={!hasImage && isInteractive ? 0 : undefined}
                onKeyDown={(e) => {
                    if (
                        !hasImage &&
                        isInteractive &&
                        (e.key === 'Enter' || e.key === ' ')
                    ) {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
            >
                {/* ── Image preview ──────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {hasImage && !isUploading && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0"
                        >
                            <img
                                src={value}
                                alt="Upload preview"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                        'https://placehold.co/800x450/e5e7eb/9ca3af?text=Image+Error';
                                }}
                            />

                            {/* Action overlay — shown on hover */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-200 hover:bg-black/40 hover:opacity-100">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 gap-1.5 bg-white/90 text-gray-900 hover:bg-white dark:bg-gray-900/90 dark:text-gray-100 dark:hover:bg-gray-900"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isInteractive)
                                            inputRef.current?.click();
                                    }}
                                    disabled={!isInteractive}
                                    aria-label="Replace image"
                                >
                                    <ImagePlus className="h-3.5 w-3.5" />
                                    Replace
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 gap-1.5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isInteractive) handleRemove();
                                    }}
                                    disabled={!isInteractive}
                                    aria-label="Remove image"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Upload progress overlay ────────────────────────── */}
                    {isUploading && (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50/80 dark:bg-gray-900/80"
                        >
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
                            <div className="w-40 space-y-1.5">
                                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                    <motion.div
                                        className="h-full rounded-full bg-gray-600 dark:bg-gray-300"
                                        initial={{ width: '0%' }}
                                        animate={{
                                            width: `${uploadProgress}%`,
                                        }}
                                        transition={{ duration: 0.15 }}
                                    />
                                </div>
                                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                                    Uploading… {uploadProgress}%
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Empty dropzone ─────────────────────────────────── */}
                    {!hasImage && !isUploading && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
                        >
                            <div
                                className={cn(
                                    'flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-200',
                                    isDragging
                                        ? 'border-gray-500 bg-gray-200 dark:border-gray-400 dark:bg-gray-700'
                                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                                )}
                            >
                                <UploadCloud
                                    className={cn(
                                        'h-6 w-6 transition-colors',
                                        isDragging
                                            ? 'text-gray-700 dark:text-gray-200'
                                            : 'text-gray-400 dark:text-gray-500'
                                    )}
                                />
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isDragging
                                        ? 'Drop image here'
                                        : 'Drag & drop or click to upload'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {hint ??
                                        `JPEG, PNG, WEBP — max ${maxSizeLabel}`}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Validation error ─────────────────────────────────────────── */}
            <AnimatePresence>
                {localError && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/50 dark:bg-red-950/30"
                    >
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            {localError}
                        </p>
                        <button
                            type="button"
                            onClick={() => setLocalError(null)}
                            aria-label="Dismiss error"
                            className="ml-2 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={accept.join(',')}
                className="sr-only"
                onChange={handleInputChange}
                disabled={!isInteractive}
                aria-hidden="true"
            />
        </div>
    );
}
