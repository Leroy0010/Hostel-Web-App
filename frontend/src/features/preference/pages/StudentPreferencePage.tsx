import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PreferenceTagSelector } from '../components/PreferenceTagSelector';
import { PreferenceTagBadge } from '../components/PreferenceTagBadge';
import {
    RoomMatchCard,
    RoomMatchCardSkeleton,
} from '../components/RoomMatchCard';
import {
    useMyPreferences,
    useRoomMatches,
    useSavePreferences,
} from '../hooks/preference.hooks';
import { preferenceUpdatedLabel } from '../utils/preference.utils';
import { transition } from '@/features/auth/utils/transition';
import type { PreferenceTag } from '../types/preference.types';
import { useActiveHostels } from '@/features/hostel/hooks/hostel.hooks';

// =============================================================================
// Animation variants
// =============================================================================

const pageVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition },
};

const sectionVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition },
};

// =============================================================================
// Page
// =============================================================================

/**
 * Student preferences and roommate matching page.
 *
 * ## Two panels:
 *
 * ### 1 — My Preferences
 * Allows the student to select up to 10 lifestyle tags (e.g. QUIET, NEAT,
 * NIGHT_OWL) that describe how they live. Tags are saved via a single
 * `PUT /api/preferences/my` call with full-replace semantics.
 *
 * The selector disables unselected tags once 10 are chosen, and shows the
 * current count. A "Save" button is only shown when unsaved changes exist.
 *
 * ### 2 — Find Compatible Roommates
 * After setting preferences, the student picks one of their active hostel
 * bookings (or any active hostel) and requests roommate suggestions.
 *
 * Results are ordered by number of shared lifestyle tags. Each suggestion card
 * shows the overlapping tags so students understand *why* a room was suggested.
 * An empty result is displayed gracefully — not as an error.
 *
 * ## State management
 * - Preferences: React Query (`useMyPreferences`) + local draft state for
 *   unsaved changes. Saving uses `useSavePreferences` mutation.
 * - Match results: React Query (`useRoomMatches`) keyed by hostelId — results
 *   are cached per-hostel and re-fetched only when the hostel changes.
 *
 * Route: {@code /student/preferences} — protected, STUDENT only.
 */
export default function StudentPreferencePage() {
    // ── Preferences state ────────────────────────────────────────────────────

    const { data: savedPrefs, isLoading: isLoadingPrefs } = useMyPreferences();
    const { mutate: save, isPending: isSaving } = useSavePreferences();

    /**
     * Local draft — tracks unsaved changes so we can diff against savedPrefs
     * and only show the Save button when something actually changed.
     * Initialised once savedPrefs loads.
     */
    const [draftTags, setDraftTags] = useState<PreferenceTag[]>([]);
    const [draftInitialised, setDraftInitialised] = useState(false);

    const [prevSavedPrefs, setPrevSavedPrefs] =
        useState<typeof savedPrefs>(undefined);

    // If savedPrefs just finished loading or changed, sync the draft immediately during render
    if (savedPrefs !== prevSavedPrefs) {
        setPrevSavedPrefs(savedPrefs);
        setDraftTags(savedPrefs?.tags || []);
        setDraftInitialised(true);
    }

    /** True when the draft differs from what's persisted on the server. */
    const hasUnsavedChanges =
        draftInitialised &&
        JSON.stringify([...draftTags].sort()) !==
            JSON.stringify([...(savedPrefs?.tags ?? [])].sort());

    const handleSave = () => {
        save({ tags: draftTags });
    };

    // ── Hostel selection for match results ───────────────────────────────────

    const [selectedHostelId, setSelectedHostelId] = useState<
        string | undefined
    >();

    // Fetch the student's active hostels to populate the hostel selector.
    const { data: activeHostelsPage } = useActiveHostels({ size: 50 });

    const activeHostels = useMemo(() => {
        return activeHostelsPage?.content;
    }, [activeHostelsPage?.content]);

    const {
        data: matchResult,
        isLoading: isLoadingMatches,
        isFetching: isFetchingMatches,
    } = useRoomMatches(selectedHostelId);

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* ── Page header ─────────────────────────────────────────────── */}
            <PageHeader
                title="Preferences & Roommate Matching"
                description="Set your lifestyle tags to find rooms with compatible existing occupants."
            />

            {/* ── Section 1: My Preferences ───────────────────────────────── */}
            <motion.section
                variants={sectionVariants}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950"
                aria-labelledby="preferences-heading"
            >
                {/* Section header */}
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Tag
                            className="h-4 w-4 text-gray-400 dark:text-gray-500"
                            aria-hidden="true"
                        />
                        <div>
                            <h2
                                id="preferences-heading"
                                className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                            >
                                My Lifestyle Tags
                            </h2>
                            {savedPrefs && (
                                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                    {preferenceUpdatedLabel(
                                        savedPrefs.updatedAt
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Save button — only visible when there are unsaved changes */}
                    <AnimatePresence>
                        {hasUnsavedChanges && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="gap-1.5 bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                                >
                                    <CheckCircle2
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                    {isSaving ? 'Saving…' : 'Save changes'}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Tag selector */}
                {isLoadingPrefs ? (
                    <PreferenceTagSelectorSkeleton />
                ) : (
                    <PreferenceTagSelector
                        selected={draftTags}
                        onChange={setDraftTags}
                        maxTags={10}
                        disabled={isSaving}
                    />
                )}
            </motion.section>

            {/* ── Section 2: Roommate Matching ────────────────────────────── */}
            <motion.section
                variants={sectionVariants}
                className="space-y-4"
                aria-labelledby="matching-heading"
            >
                {/* Section header */}
                <div className="flex items-center gap-2">
                    <Sparkles
                        className="h-4 w-4 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                    />
                    <h2
                        id="matching-heading"
                        className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                    >
                        Find Compatible Roommates
                    </h2>
                </div>

                {/* Hostel selector */}

                {activeHostels && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="w-full sm:max-w-xs">
                            <Select
                                value={selectedHostelId ?? ''}
                                onValueChange={(val) =>
                                    setSelectedHostelId(val || undefined)
                                }
                            >
                                <SelectTrigger className="w-full border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                                    <SelectValue placeholder="Select a hostel…" />
                                </SelectTrigger>
                                <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                    {activeHostels.map((h) => (
                                        <SelectItem key={h.id} value={h.id}>
                                            {h.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Contextual hint */}
                        {!selectedHostelId && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Pick a hostel to see rooms whose occupants share
                                your interests.
                            </p>
                        )}
                    </div>
                )}

                {/* ── Match results ──────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {/* No hostel selected yet */}
                    {!selectedHostelId && (
                        <motion.div
                            key="no-hostel"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <EmptyState
                                icon={
                                    <Users className="h-8 w-8 text-gray-400" />
                                }
                                title="Select a hostel above"
                                description="Suggestions will appear once you pick a hostel and have saved at least one lifestyle tag."
                            />
                        </motion.div>
                    )}

                    {/* Loading */}
                    {selectedHostelId && isLoadingMatches && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {Array.from({ length: 3 }).map((_, i) => (
                                <RoomMatchCardSkeleton key={i} />
                            ))}
                        </motion.div>
                    )}

                    {/* Results */}
                    {selectedHostelId && !isLoadingMatches && matchResult && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`space-y-3 transition-opacity duration-200 ${isFetchingMatches ? 'opacity-60' : 'opacity-100'}`}
                        >
                            {/* Student's own tags — context for the results */}
                            {matchResult.myTags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900">
                                    <span className="mr-1 text-xs text-gray-400 dark:text-gray-500">
                                        Matching on:
                                    </span>
                                    {matchResult.myTags.map((tag) => (
                                        <PreferenceTagBadge
                                            key={tag}
                                            tag={tag}
                                            size="sm"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Suggestions */}
                            {matchResult.suggestions.length === 0 ? (
                                <EmptyState
                                    icon={
                                        <Users className="h-8 w-8 text-gray-400" />
                                    }
                                    title="No compatible rooms found"
                                    description={
                                        matchResult.myTags.length === 0
                                            ? 'Add lifestyle tags above and save them — then try again.'
                                            : 'No current occupants in this hostel share your lifestyle tags yet. Check back as more students book in.'
                                    }
                                />
                            ) : (
                                <>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {matchResult.suggestions.length} room
                                        {matchResult.suggestions.length !== 1
                                            ? 's'
                                            : ''}{' '}
                                        found — sorted by best lifestyle match
                                    </p>
                                    {matchResult.suggestions.map((s, i) => (
                                        <RoomMatchCard
                                            key={s.roomId}
                                            suggestion={s}
                                            hostelId={selectedHostelId}
                                            rank={i + 1}
                                        />
                                    ))}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.section>
        </motion.div>
    );
}

// =============================================================================
// Internal skeleton
// =============================================================================

/**
 * Skeleton for the tag selector while preferences are loading.
 * Renders three group-shaped rows to match the final layout.
 */
function PreferenceTagSelectorSkeleton() {
    return (
        <div className="space-y-5" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 2 }).map((_, j) => (
                            <div
                                key={j}
                                className="h-8 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
