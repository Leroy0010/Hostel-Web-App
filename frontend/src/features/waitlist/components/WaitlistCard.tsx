import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    BellOff,
    Building2,
    CalendarDays,
    ChevronRight,
    Clock,
    DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WaitlistPositionBadge } from './WaitlistPositionBadge';
import { useLeaveWaitlist } from '../hooks/waitlist.hooks';
import {
    joinedAtLabel,
    roomTypeLabel,
    semesterLabel,
} from '../utils/waitlist.utils';
import type { WaitlistDto } from '../types/waitlist.types';
import { ZoomableImage } from '@/components/ui/ZoomableImage';

interface WaitlistCardProps {
    entry: WaitlistDto;
}

/**
 * Student-facing card for a single waitlist entry.
 *
 * Displays:
 *  - Hostel thumbnail + name.
 *  - Room type, academic year, semester.
 *  - Queue position badge (color-coded by rank).
 *  - Notification indicator (pulsing dot when already notified — draft booking created).
 *  - "View hostel" navigation link.
 *  - "Leave waitlist" with confirmation dialog.
 *
 * Used in the paginated list on {@link StudentWaitlistPage}.
 *
 * @example
 * ```tsx
 * {entries.map(entry => <WaitlistCard key={entry.id} entry={entry} />)}
 * ```
 */
export function WaitlistCard({ entry }: WaitlistCardProps) {
    const navigate = useNavigate();
    const [confirmLeave, setConfirmLeave] = useState(false);

    const { mutate: leave, isPending: isLeaving } = useLeaveWaitlist();

    const handleLeave = () => {
        leave(
            {
                hostelId: entry.hostelId,
                payload: {
                    roomType: entry.roomType,
                    academicYear: entry.academicYear,
                    semester: entry.semester,
                },
            },
            { onSuccess: () => setConfirmLeave(false) }
        );
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
            >
                {/* ── Notified banner — shown when promoted to a draft booking ─ */}
                {entry.notified && (
                    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800/50 dark:bg-amber-950/30">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        </span>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            A room has opened up — check your bookings!
                        </p>
                    </div>
                )}

                <div className="flex gap-4 p-4">
                    {/* Hostel thumbnail */}
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        {entry.hostelImageUrl ? (
                            <ZoomableImage
                                src={entry.hostelImageUrl}
                                alt={entry.hostelName}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                        'https://placehold.co/96x80/e5e7eb/9ca3af?text=No+Image';
                                }}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <Building2 className="h-6 w-6 text-gray-400" />
                            </div>
                        )}
                    </div>

                    {/* Main content */}
                    <div className="min-w-0 flex-1 space-y-2">
                        {/* Hostel name + position badge */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                                    {entry.hostelName}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <DoorOpen
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        {roomTypeLabel(entry.roomType)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CalendarDays
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        {entry.academicYear} ·{' '}
                                        {semesterLabel(entry.semester)}
                                    </span>
                                </div>
                            </div>

                            <WaitlistPositionBadge
                                position={entry.position}
                                compact
                            />
                        </div>

                        {/* Meta row: join date + notification status */}
                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                Joined {joinedAtLabel(entry.joinedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                                {entry.notified ? (
                                    <>
                                        <Bell
                                            className="h-3 w-3 text-amber-500"
                                            aria-hidden="true"
                                        />
                                        <span className="text-amber-600 dark:text-amber-400">
                                            Notified
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <BellOff
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        Awaiting
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    navigate(`/hostels/${entry.hostelId}`)
                                }
                                className="h-7 gap-1 px-2 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                            >
                                View hostel
                                <ChevronRight
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmLeave(true)}
                                className="ml-auto h-7 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                                Leave queue
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Leave confirmation */}
            <ConfirmDialog
                open={confirmLeave}
                onOpenChange={setConfirmLeave}
                title="Leave this waitlist?"
                description={`You will lose your position (#${entry.position}) in the queue for a ${roomTypeLabel(entry.roomType)} room at ${entry.hostelName}. This cannot be undone.`}
                confirmLabel="Leave queue"
                variant="destructive"
                isPending={isLeaving}
                onConfirm={handleLeave}
            />
        </>
    );
}

/** Skeleton matching the WaitlistCard layout. */
export function WaitlistCardSkeleton() {
    return (
        <div
            className="flex gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            <div className="h-20 w-24 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2.5 pt-1">
                <div className="flex justify-between">
                    <div className="space-y-1.5">
                        <div className="h-4 w-40 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-56 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-6 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-3 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="flex gap-2 pt-1">
                    <div className="h-6 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="ml-auto h-6 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    );
}
