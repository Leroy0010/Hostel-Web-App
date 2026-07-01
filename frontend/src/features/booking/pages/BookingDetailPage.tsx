import {  useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    CalendarCheck,
    Clock,
    CreditCard,
    DoorOpen,
    ListOrdered,
    LogIn,
    LogOut,
    Star,
    User,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { PaymentCountdown } from '../components/PaymentCountdown';
import { SubmitPaymentForm } from '../components/SubmitPaymentForm';
import { ActionBookingForm } from '../components/ActionBookingForm';
import {
    useBookingDetail,
    useCancelBooking,
    useCheckIn,
    useCheckOut,
} from '../hooks/booking.hooks';
import {
    formatDateTime,
    isPastDeadline,
    isStudentCancellable,
    isTerminalStatus,
    semesterLabel,
} from '../utils/booking.utils';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { CreateReviewForm } from '@/features/review/components/CreateReviewForm';
import { transition } from '@/features/auth/utils/transition';
import { BookingDetailSkeleton } from '../components/BookingDetailSkeleton';
import { BackButton } from '@/components/ui/BackButton';

// =============================================================================
// Types
// =============================================================================

/**
 * Discriminated union controlling dialog visibility.
 * Only one dialog is ever open at a time.
 */
type ActiveDialog =
    | 'cancel'
    | 'checkin'
    | 'checkout'
    | 'payment'
    | 'review'
    | 'action'
    | null;

// =============================================================================
// Animation
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

const itemVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page component
// =============================================================================

/**
 * Full booking detail page with role-aware conditional CTAs.
 *
 * ## Sections
 *  1. Back navigation.
 *  2. Header card — hostel, room, status badge, period, waitlist-draft indicator.
 *  3. Payment countdown — APPROVED bookings with an active deadline.
 *  4. Pending expires countdown — waitlist-draft PENDING bookings (separate
 *     deadline: the manager must action the draft within N hours).
 *  5. Detail grid — all timestamps, actors, and payment data.
 *  6. Action panel — role + state conditional:
 *     - **STUDENT**: Cancel (PENDING/APPROVED), Submit Payment (APPROVED, not yet paid).
 *     - **MANAGER/ADMIN**: Approve/Reject (PENDING), Check In (APPROVED + paid),
 *       Check Out (CHECKED_IN).
 *     - **Any role (CHECKED_IN)**: Leave Review button (student only).
 *
 * ## CTA logic matrix
 * | Action           | Role            | Status req.       | Extra condition          |
 * |------------------|-----------------|-------------------|--------------------------|
 * | Cancel           | STUDENT         | PENDING/APPROVED  | —                        |
 * | Submit Payment   | STUDENT         | APPROVED          | No paymentRef yet        |
 * | Approve/Reject   | MANAGER/ADMIN   | PENDING           | —                        |
 * | Check In         | MANAGER/ADMIN   | APPROVED          | paymentRef exists        |
 * | Check Out        | MANAGER/ADMIN   | CHECKED_IN        | —                        |
 * | Leave Review     | STUDENT         | CHECKED_IN        | —                        |
 *
 * ## Dialog strategy
 * A single {@link ActiveDialog} discriminated union drives all modal visibility.
 *
 * Route: {@code /bookings/:id} — all authenticated roles.
 */
export default function BookingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { user } = useAuthStore();
    const isStudent = user?.role === 'STUDENT';
    const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
    const closeDialog = () => setActiveDialog(null);

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: booking, isLoading, isError, refetch } = useBookingDetail(id);

    const hostelId = booking?.room.hostelId ?? '';

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: cancel, isPending: isCancelling } = useCancelBooking();
    const { mutate: checkIn, isPending: isCheckingIn } = useCheckIn(
        id ?? '',
        hostelId
    );
    const { mutate: checkOut, isPending: isCheckingOut } = useCheckOut(
        id ?? '',
        hostelId
    );

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return <BookingDetailSkeleton />;
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (isError || !booking) {
        return (
            <div className="space-y-4">
                <BackButton onClick={() => navigate(-1)} />
                <EmptyState
                    icon={<CalendarCheck className="h-8 w-8 text-gray-400" />}
                    title="Booking not found"
                    description="This booking may have been removed or you do not have permission to view it."
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                        >
                            Try again
                        </Button>
                    }
                />
            </div>
        );
    }

    // ── CTA logic ─────────────────────────────────────────────────────────────
    const isTerminal = isTerminalStatus(booking.status);

    // STUDENT actions
    const canStudentCancel = isStudent && isStudentCancellable(booking.status);
    const canSubmitPayment =
        isStudent &&
        booking.status === 'APPROVED' &&
        !booking.paymentRef &&
        !isPastDeadline(booking.paymentExpiresAt);

    // MANAGER / ADMIN actions
    const canManagerAction = isManagerOrAdmin && booking.status === 'PENDING';
    const canCheckIn =
        isManagerOrAdmin &&
        booking.status === 'APPROVED' &&
        Boolean(booking.paymentRef);
    const canCheckOut = isManagerOrAdmin && booking.status === 'CHECKED_IN';

    // Review — student who has checked in
    const canLeaveReview = isStudent && booking.status === 'CHECKED_IN';

    const hasAnyAction =
        canStudentCancel ||
        canSubmitPayment ||
        canManagerAction ||
        canCheckIn ||
        canCheckOut;

    // Deadline flags
    const paymentDeadlineActive =
        booking.status === 'APPROVED' && Boolean(booking.paymentExpiresAt);
    const pendingDeadlineActive =
        booking.status === 'PENDING' &&
        booking.isWaitlistDraft &&
        Boolean(booking.pendingExpiresAt);

    return (
        <>
            <motion.div
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto max-w-2xl space-y-5"
            >
                {/* ── Back navigation ───────────────────────────────────── */}
                <BackButton onClick={() => navigate(-1)} />

                {/* ── Header card ───────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <div className="p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            {/* Left — hostel, room, period */}
                            <div className="min-w-0 space-y-1 pr-20 sm:pr-0">
                                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                                    <Building2
                                        className="h-3.5 w-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">
                                        {booking.room.hostelName}
                                    </span>
                                </div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    Room {booking.room.roomNumber}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {booking.room.roomType} ·{' '}
                                    {booking.academicYear} ·{' '}
                                    {semesterLabel(booking.semester)}
                                </p>
                            </div>

                            {/* Right — status badge + review button */}
                            <div className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto sm:flex sm:shrink-0 sm:flex-col sm:items-end sm:gap-2">
                                <BookingStatusBadge status={booking.status} />

                                {canLeaveReview && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setActiveDialog('review')
                                        }
                                        className="mt-2 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 sm:mt-0 dark:border-amber-800/50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                    >
                                        <Star
                                            className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                                            aria-hidden="true"
                                        />
                                        Leave a Review
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Waitlist-draft indicator */}
                        {booking.isWaitlistDraft && (
                            <motion.div
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                className="mt-3 flex items-center gap-1.5"
                            >
                                <ListOrdered
                                    className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400"
                                    aria-hidden="true"
                                />
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                    Promoted from waitlist
                                </span>
                            </motion.div>
                        )}
                    </div>

                    {/* Payment deadline countdown — APPROVED with deadline */}
                    <AnimatePresence>
                        {paymentDeadlineActive && (
                            <motion.div
                                key="payment-countdown"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
                            >
                                <div className="px-5 py-4">
                                    <PaymentCountdown
                                        deadlineIso={booking.paymentExpiresAt!}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pending-draft deadline countdown — waitlist draft awaiting manager action */}
                    <AnimatePresence>
                        {pendingDeadlineActive && (
                            <motion.div
                                key="pending-countdown"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-purple-100 dark:border-purple-900/40"
                            >
                                <div className="flex items-start gap-2 bg-purple-50/60 px-5 py-3 dark:bg-purple-950/20">
                                    <Clock
                                        className="mt-0.5 h-4 w-4 shrink-0 text-purple-500 dark:text-purple-400"
                                        aria-hidden="true"
                                    />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                            Manager action required
                                        </p>
                                        <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
                                            This waitlist-promoted booking must
                                            be approved or rejected before{' '}
                                            <span className="font-medium">
                                                {formatDateTime(
                                                    booking.pendingExpiresAt
                                                )}
                                            </span>
                                            . After that it expires
                                            automatically.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Detail grid ───────────────────────────────────────── */}
                <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-950">
                    {/* Student info — visible to managers/admins */}
                    {isManagerOrAdmin && (
                        <DetailRow
                            icon={<User className="h-4 w-4" />}
                            label="Student"
                            value={`${booking.student.firstName} ${booking.student.lastName}`}
                            subValue={booking.student.email}
                        />
                    )}

                    <DetailRow
                        icon={<DoorOpen className="h-4 w-4" />}
                        label="Room type"
                        value={booking.room.roomType}
                    />

                    <DetailRow
                        icon={<Clock className="h-4 w-4" />}
                        label="Requested at"
                        value={formatDateTime(booking.requestedAt)}
                    />

                    {booking.approvedAt && (
                        <DetailRow
                            icon={<Clock className="h-4 w-4" />}
                            label={
                                booking.status === 'REJECTED'
                                    ? 'Rejected at'
                                    : 'Approved at'
                            }
                            value={formatDateTime(booking.approvedAt)}
                        />
                    )}

                    {booking.approvedBy && (
                        <DetailRow
                            icon={<User className="h-4 w-4" />}
                            label="Actioned by"
                            value={`${booking.approvedBy.firstName} ${booking.approvedBy.lastName}`}
                        />
                    )}

                    {booking.rejectedReason && (
                        <DetailRow
                            icon={<XCircle className="h-4 w-4 text-red-400" />}
                            label="Rejection reason"
                            value={booking.rejectedReason}
                            valueClass="text-red-600 dark:text-red-400"
                        />
                    )}

                    {booking.paymentRef && (
                        <>
                            <DetailRow
                                icon={<CreditCard className="h-4 w-4" />}
                                label="Payment reference"
                                value={booking.paymentRef}
                                mono
                            />
                            {booking.amountPaid && (
                                <DetailRow
                                    icon={<CreditCard className="h-4 w-4" />}
                                    label="Amount paid"
                                    value={`₵${parseFloat(booking.amountPaid).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`}
                                />
                            )}
                        </>
                    )}

                    {booking.checkedInAt && (
                        <DetailRow
                            icon={<LogIn className="h-4 w-4 text-green-500" />}
                            label="Checked in"
                            value={formatDateTime(booking.checkedInAt)}
                        />
                    )}

                    {booking.checkedOutAt && (
                        <DetailRow
                            icon={<LogOut className="h-4 w-4 text-gray-400" />}
                            label="Checked out"
                            value={formatDateTime(booking.checkedOutAt)}
                        />
                    )}
                </div>

                {/* ── Action panel ──────────────────────────────────────── */}
                <AnimatePresence>
                    {hasAnyAction && !isTerminal && (
                        <motion.div
                            key="actions"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0 }}
                            className="flex flex-wrap gap-2"
                        >
                            {/* STUDENT: submit payment */}
                            {canSubmitPayment && (
                                <Button
                                    onClick={() => setActiveDialog('payment')}
                                    className="bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                >
                                    <CreditCard
                                        className="mr-2 h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    Submit Payment
                                </Button>
                            )}

                            {/* STUDENT: cancel */}
                            {canStudentCancel && (
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveDialog('cancel')}
                                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                    <XCircle
                                        className="mr-2 h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    Cancel Booking
                                </Button>
                            )}

                            {/* MANAGER/ADMIN: approve / reject */}
                            {canManagerAction && (
                                <Button
                                    onClick={() => setActiveDialog('action')}
                                    className="bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                >
                                    <CalendarCheck
                                        className="mr-2 h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    Approve / Reject
                                </Button>
                            )}

                            {/* MANAGER/ADMIN: check in */}
                            {canCheckIn && (
                                <Button
                                    onClick={() => setActiveDialog('checkin')}
                                    className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                                >
                                    <LogIn
                                        className="mr-2 h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    Check In Student
                                </Button>
                            )}

                            {/* MANAGER/ADMIN: check out */}
                            {canCheckOut && (
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveDialog('checkout')}
                                    className="border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    <LogOut
                                        className="mr-2 h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    Check Out Student
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Payment already submitted but awaiting check-in — status hint */}
                {isStudent &&
                    booking.status === 'APPROVED' &&
                    booking.paymentRef && (
                        <motion.div
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/20"
                        >
                            <CreditCard
                                className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
                                aria-hidden="true"
                            />
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                    Payment submitted
                                </p>
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                    Your payment reference has been received.
                                    The manager will verify and check you in.
                                </p>
                            </div>
                        </motion.div>
                    )}
            </motion.div>

            {/* ================================================================
                Dialogs — one active at a time via ActiveDialog union
            ================================================================ */}

            {/* Submit payment */}
            <Dialog
                open={activeDialog === 'payment'}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent className="max-w-md border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">
                            Submit Payment Reference
                        </DialogTitle>
                    </DialogHeader>
                    <SubmitPaymentForm
                        bookingId={booking.id}
                        onSuccess={closeDialog}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>

            {/* Cancel booking */}
            <ConfirmDialog
                open={activeDialog === 'cancel'}
                onOpenChange={(open) => !open && closeDialog()}
                title="Cancel this booking?"
                description="Your booking request will be cancelled. A bed slot may become available for other students on the waitlist."
                confirmLabel="Cancel Booking"
                variant="destructive"
                isPending={isCancelling}
                onConfirm={() => {
                    cancel(booking.id, { onSuccess: closeDialog });
                }}
            />

            {/* Manager: approve / reject */}
            {activeDialog === 'action' && (
                <Dialog open onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="max-w-md border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">
                                Action Booking
                            </DialogTitle>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {booking.student.firstName}{' '}
                                {booking.student.lastName} · Room{' '}
                                {booking.room.roomNumber} ·{' '}
                                {booking.room.hostelName}
                            </p>
                        </DialogHeader>
                        <ActionBookingForm
                            bookingId={booking.id}
                            roomId={booking.room.id}
                            onSuccess={closeDialog}
                            onCancel={closeDialog}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Check in */}
            <ConfirmDialog
                open={activeDialog === 'checkin'}
                onOpenChange={(open) => !open && closeDialog()}
                title="Check student in?"
                description={`Confirm you have verified the payment reference (${booking.paymentRef ?? '—'}). ${booking.student.firstName} ${booking.student.lastName} will be marked as a resident.`}
                confirmLabel="Check In"
                isPending={isCheckingIn}
                onConfirm={() => {
                    checkIn(undefined, { onSuccess: closeDialog });
                }}
            />

            {/* Check out */}
            <ConfirmDialog
                open={activeDialog === 'checkout'}
                onOpenChange={(open) => !open && closeDialog()}
                title="Check student out?"
                description={`${booking.student.firstName} ${booking.student.lastName} will be marked as checked out, their bed will be freed, and the waitlist will be automatically promoted if anyone is queued.`}
                confirmLabel="Check Out"
                isPending={isCheckingOut}
                onConfirm={() => {
                    checkOut(undefined, { onSuccess: closeDialog });
                }}
            />

            {/* Leave review */}
            <Dialog
                open={activeDialog === 'review'}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent className="max-w-sm border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <CreateReviewForm
                        hostelId={hostelId}
                        bookingId={booking.id}
                        onSuccess={closeDialog}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

// =============================================================================
// Internal sub-components
// =============================================================================


/**
 * A single key-value row in the detail grid.
 *
 * @param mono       - Renders value in monospace (payment references, IDs).
 * @param subValue   - Secondary line under the main value (e.g. email under name).
 * @param valueClass - Additional Tailwind overrides for the value text.
 */
function DetailRow({
    icon,
    label,
    value,
    subValue,
    mono = false,
    valueClass,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    mono?: boolean;
    valueClass?: string;
}) {
    return (
        <div className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    {label}
                </p>
                <p
                    className={`mt-0.5 text-sm wrap-break-word text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : ''} ${valueClass ?? ''}`}
                >
                    {value}
                </p>
                {subValue && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    );
}


