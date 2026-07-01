import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Loader2, Paperclip, Plus, Trash2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/FieldError';

import {
    useAddAttachment,
    useDeleteAttachment,
} from '../hooks/complaint.hooks';
import {
    addAttachmentSchema,
    type AddAttachmentFormValues,
    type AttachmentDto,
} from '../types/complaint.types';
import { ZoomableImage } from '@/components/ui/ZoomableImage';

// =============================================================================
// Types
// =============================================================================

interface AttachmentManagerProps {
    complaintId: string;
    attachments: AttachmentDto[];
    /** Whether the current user can add/remove attachments. */
    canManage: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Attachment panel for a complaint — displays existing files and allows
 * the author (or manager/admin) to add or remove attachments.
 *
 * Attachment URLs are S3 URLs or public file URLs uploaded separately.
 * The form only accepts the final URL (post-upload), matching the backend
 * {@code AddAttachmentRequest} contract.
 *
 * Images are rendered as thumbnails; other file types show as linked chips.
 */
export function AttachmentManager({
    complaintId,
    attachments,
    canManage,
}: AttachmentManagerProps) {
    const [showForm, setShowForm] = useState(false);
    const { mutate: addAttachment, isPending: isAdding } =
        useAddAttachment(complaintId);
    const { mutate: deleteAttachment } = useDeleteAttachment(complaintId);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddAttachmentFormValues>({
        resolver: zodResolver(addAttachmentSchema),
        defaultValues: { fileUrl: '', fileType: '' },
    });

    const onAdd = (data: AddAttachmentFormValues) => {
        addAttachment(
            { fileUrl: data.fileUrl, fileType: data.fileType || undefined },
            {
                onSuccess: () => {
                    reset();
                    setShowForm(false);
                },
            }
        );
    };

    const isImage = (url: string, fileType?: string | null) => {
        if (fileType?.startsWith('image/')) return true;
        return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
    };

    const INPUT_CLS =
        'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600';

    return (
        <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    Attachments ({attachments.length})
                </p>
                {canManage && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForm((p) => !p)}
                        className="h-7 gap-1 border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        {showForm ? 'Cancel' : 'Add'}
                    </Button>
                )}
            </div>

            {/* Attachment grid */}
            {attachments.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    No attachments yet.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <AnimatePresence mode="popLayout">
                        {attachments.map((att) => (
                            <motion.div
                                key={att.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.18 }}
                                className="group relative"
                            >
                                {isImage(att.fileUrl, att.fileType) ? (
                                    /* Image thumbnail */
                                    <div className="relative h-20 w-24 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                                        <ZoomableImage
                                            src={att.fileUrl}
                                            alt="Attachment"
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                                            <a
                                                href={att.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-md bg-white/90 p-1.5 text-gray-900"
                                                aria-label="Open attachment"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteAttachment(att.id)
                                                    }
                                                    className="rounded-md bg-red-600 p-1.5 text-white"
                                                    aria-label="Remove attachment"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* File chip */
                                    <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
                                        <Paperclip
                                            className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
                                            aria-hidden="true"
                                        />
                                        <a
                                            href={att.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-medium text-gray-700 hover:underline dark:text-gray-300"
                                        >
                                            {att.fileType ?? 'File'}
                                        </a>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteAttachment(att.id)
                                                }
                                                className="ml-1 text-gray-300 transition-colors hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                                                aria-label="Remove attachment"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add attachment form */}
            <AnimatePresence>
                {showForm && canManage && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                            duration: 0.22,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                    >
                        <form
                            onSubmit={handleSubmit(onAdd)}
                            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-end dark:border-gray-800 dark:bg-gray-900/60"
                            noValidate
                        >
                            <div className="flex-1 space-y-1.5">
                                <Label
                                    htmlFor="att-url"
                                    className="text-xs font-medium text-gray-700 dark:text-gray-300"
                                >
                                    File URL
                                </Label>
                                <Input
                                    id="att-url"
                                    placeholder="https://…"
                                    className={INPUT_CLS}
                                    {...register('fileUrl')}
                                />
                                {errors.fileUrl && (
                                    <FieldError
                                        message={errors.fileUrl.message!}
                                    />
                                )}
                            </div>
                            <div className="w-36 space-y-1.5">
                                <Label
                                    htmlFor="att-type"
                                    className="text-xs font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Type{' '}
                                    <span className="text-gray-400">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    id="att-type"
                                    placeholder="image/jpeg"
                                    className={INPUT_CLS}
                                    {...register('fileType')}
                                />
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isAdding}
                                className="shrink-0 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                            >
                                {isAdding && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                )}
                                Add
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
