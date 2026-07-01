import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ManagerWaitlistTable } from '../components/ManagerWaitlistTable';
import { transition } from '@/features/auth/utils/transition';

// =============================================================================
// Animation variants
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page
// =============================================================================

/**
 * Manager-facing waitlist management page for a single hostel.
 *
 * Displays the full room-type-scoped queue for the hostel, with filters
 * by room type, academic year, and semester.
 *
 * The manager can:
 *  - View all students waiting and their queue positions.
 *  - See which students have already been notified (draft booking created).
 *  - Force-remove individual entries for misconduct or data correction.
 *
 * Promotion (auto-drafting the next student when a bed frees up) is handled
 * entirely on the backend — the manager's job here is read + force-remove only.
 *
 * Route: {@code /manager/hostels/:hostelId/waitlist} — protected, MANAGER only.
 */
export default function ManagerWaitlistPage() {
    const { hostelId } = useParams<{ hostelId: string }>();
    const navigate = useNavigate();

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* ── Back navigation ─────────────────────────────────────────── */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
            </Button>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <PageHeader
                title="Waitlist Queue"
                description="Students queued for rooms in this hostel, sorted by room type then position. Promotion is automatic when a bed opens up."
                actions={
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <ListOrdered className="h-4 w-4" aria-hidden="true" />
                        Auto-promotes on vacancy
                    </div>
                }
            />

            {/* ── Waitlist table ──────────────────────────────────────────── */}
            {hostelId && <ManagerWaitlistTable hostelId={hostelId} />}
        </motion.div>
    );
}
