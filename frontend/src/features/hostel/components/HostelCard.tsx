import { motion } from 'framer-motion';
import { MapPin, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GenderPolicyBadge } from './GenderPolicyBadge';
import { hostelImageFallback } from '../utils/hostel.utils';
import type { HostelSummaryDto } from '../types/hostel.types';

interface HostelCardProps {
    hostel: HostelSummaryDto;
    /** Base path for the detail link. Defaults to `/hostels`. */
    basePath?: string;
}

/**
 * Summary card for a single hostel, used in the student-facing hostel list.
 *
 * Features:
 *  - Cover image with fallback placeholder.
 *  - Gender policy badge.
 *  - Address with map-pin icon.
 *  - Framer Motion lift-on-hover + tap scale for tactile feedback.
 *  - Links to the hostel detail page.
 *
 * @example
 * ```tsx
 * <HostelCard hostel={hostel} />
 * ```
 */
export function HostelCard({ hostel, basePath = '/hostels' }: HostelCardProps) {
    return (
        <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="group"
        >
            <Link
                to={`${basePath}/${hostel.id}`}
                className="block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-gray-900/50"
                aria-label={`View details for ${hostel.name}`}
            >
                {/* Cover image */}
                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                        src={hostel.imageUrl || hostelImageFallback()}
                        alt={`${hostel.name} cover`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                                hostelImageFallback();
                        }}
                        loading="lazy"
                    />

                    {/* Gender policy badge — top-right corner */}
                    <div className="absolute top-2.5 right-2.5">
                        <GenderPolicyBadge policy={hostel.genderPolicy} />
                    </div>
                </div>

                {/* Card body */}
                <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                        <h3 className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-gray-700 dark:text-gray-100 dark:group-hover:text-gray-300">
                            {hostel.name}
                        </h3>
                        <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                            <MapPin
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                            />
                            {hostel.address}
                        </p>
                    </div>

                    {/* Chevron indicator */}
                    <ChevronRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
                        aria-hidden="true"
                    />
                </div>
            </Link>
        </motion.div>
    );
}
