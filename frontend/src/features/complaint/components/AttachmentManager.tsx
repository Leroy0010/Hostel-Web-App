import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Loader2, Paperclip, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { handleUploadImage } from '@/services/cloudinary.service';

import {
    useAddAttachment,
    useDeleteAttachment,
} from '../hooks/complaint.hooks';
import type { AttachmentDto } from '../types/complaint.types';

// =============================================================================
// Types
// =============================================================================

interface AttachmentManagerProps {
    complaintId: string;
    attachments: AttachmentDto[];
    /** Whether the current user may add a new attachment (author, assigned manager, or admin). */
    canAdd: boolean;
    /** Current user's id, used to scope delete to the specific submitter of each attachment. */
    currentUserId?: string;
}

const CLOUDINARY_FOLDER = 'complaints';

// =============================================================================
// Component
// =============================================================================

/**
 * Attachment panel for a complaint — displays existing files and lets the
 * author, the assigned manager, or an admin upload new evidence directly to
 * Cloudinary (signed direct upload, matching the pattern already used for
 * hostel/room images — see `cloudinary.service.ts`).
 *
 * Deletion is scoped per attachment: only the specific user who submitted a
 * given attachment can remove it — not the complaint's author generally, and
 * not managers/admins by virtue of their role, so one contributor's evidence
 * can't be removed by another.
 *
 * Images are rendered as thumbnails; other file types show as linked chips.
 */
export function AttachmentManager({
    complaintId,
    attachments,
    canAdd,
    currentUserId,
}: AttachmentManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const { mutate: addAttachment } = useAddAttachment(complaintId);
    const { mutate: deleteAttachment } = useDeleteAttachment(complaintId);

    const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file later
        if (!file) return;

        setUploadError(null);
        setIsUploading(true);
        try {
            const fileUrl = await handleUploadImage(file, CLOUDINARY_FOLDER);
            addAttachment(
                { fileUrl, fileType: file.type || undefined },
                {
                    onError: () =>
                        setUploadError(
                            'Upload succeeded but saving the attachment failed. Please try again.'
                        ),
                }
            );
        } catch {
            setUploadError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const isImage = (url: string, fileType?: string | null) => {
        if (fileType?.startsWith('image/')) return true;
        return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
    };

    return (
        <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    Attachments ({attachments.length})
                </p>
                {canAdd && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 gap-1 border-gray-200 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        {isUploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Plus className="h-3 w-3" aria-hidden="true" />
                        )}
                        {isUploading ? 'Uploading…' : 'Add'}
                    </Button>
                )}
            </div>

            {canAdd && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileSelected}
                />
            )}

            {uploadError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                    {uploadError}
                </p>
            )}

            {/* Attachment grid */}
            {attachments.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    No attachments yet.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <AnimatePresence mode="popLayout">
                        {attachments.map((att) => {
                            const canDelete =
                                !!currentUserId &&
                                att.submittedById === currentUserId;

                            return (
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
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteAttachment(
                                                                att.id
                                                            )
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
                                            {canDelete && (
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
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
