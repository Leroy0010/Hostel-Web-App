import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/FieldError';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useUpdateComplaintStatus } from '../hooks/complaint.hooks';
import {
    updateComplaintStatusSchema,
    type ComplaintStatus,
    type UpdateComplaintStatusFormValues,
} from '../types/complaint.types';
import type { ApiError } from '@/types/api';

// =============================================================================
// Types
// =============================================================================

interface UpdateComplaintStatusFormProps {
    complaintId: string;
    hostelId: string;
    currentStatus: ComplaintStatus;
    onSuccess?: () => void;
}

const SELECT_CLS =
    'border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600';

// =============================================================================
// Component
// =============================================================================

/**
 * Manager/admin inline status update form for a complaint.
 *
 * Compact layout: label + select + submit button in a horizontal row on sm+.
 * Pre-populates the select with the current status so the manager sees the
 * current state clearly before making a change (visibility of system state —
 * Nielsen's heuristic #1).
 *
 * Used on {@link ComplaintDetailPage} and {@link ManagerHostelComplaintsPage}.
 */
export function UpdateComplaintStatusForm({
    complaintId,
    hostelId,
    currentStatus,
    onSuccess,
}: UpdateComplaintStatusFormProps) {
    const { mutate, isPending } = useUpdateComplaintStatus(
        complaintId,
        hostelId
    );

    const {
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<UpdateComplaintStatusFormValues>({
        resolver: zodResolver(updateComplaintStatusSchema),
        defaultValues: { status: currentStatus },
    });

    const onSubmit = (data: UpdateComplaintStatusFormValues) => {
        mutate(
            { status: data.status },
            {
                onSuccess: () => onSuccess?.(),
                onError: (err: ApiError) => {
                    if (err.code === 'VALIDATION_FAILED' && err.details) {
                        setError('status', {
                            type: 'server',
                            message:
                                err.details.status?.[0] ?? 'Invalid status',
                        });
                    }
                },
            }
        );
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            noValidate
        >
            <div className="flex-1 space-y-1.5">
                <Label
                    htmlFor="ucs-status"
                    className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500"
                >
                    Update status
                </Label>
                <Select
                    defaultValue={currentStatus}
                    onValueChange={(val) =>
                        setValue('status', val as ComplaintStatus, {
                            shouldValidate: true,
                        })
                    }
                >
                    <SelectTrigger id="ucs-status" className={SELECT_CLS}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>
                {errors.status && (
                    <FieldError message={errors.status.message!} />
                )}
            </div>

            <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="shrink-0 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
                {isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Update
            </Button>
        </form>
    );
}
