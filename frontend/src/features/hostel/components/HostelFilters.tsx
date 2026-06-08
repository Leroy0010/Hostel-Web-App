import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { GenderPolicy } from '../types/hostel.types';

// =============================================================================
// Types
// =============================================================================

export interface HostelFilterValues {
    search: string;
    genderPolicy: GenderPolicy | 'ALL';
}

interface HostelFiltersProps {
    values: HostelFilterValues;
    onChange: (values: HostelFilterValues) => void;
    /** Hides the status filter (not applicable on the public student list). */
    showStatusFilter?: boolean;
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Filter bar for hostel list pages.
 *
 * Provides:
 *  - Full-text search input (client-side filtering by name/address).
 *  - Gender policy dropdown filter.
 *
 * This is a controlled component — all state lives in the parent
 * (typically stored in the page's URL search params for shareability).
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<HostelFilterValues>({
 *   search: '',
 *   genderPolicy: 'ALL',
 * });
 *
 * <HostelFilters values={filters} onChange={setFilters} />
 * ```
 */
export function HostelFilters({
    values,
    onChange,
    className,
}: HostelFiltersProps) {
    const hasActiveFilters =
        values.search !== '' || values.genderPolicy !== 'ALL';

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...values, search: e.target.value });
    };

    const handlePolicyChange = (val: string) => {
        onChange({ ...values, genderPolicy: val as GenderPolicy | 'ALL' });
    };

    const clearFilters = () => {
        onChange({ search: '', genderPolicy: 'ALL' });
    };

    return (
        <div className={className}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative max-w-sm">
                    <Search
                        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        placeholder="Search hostels…"
                        value={values.search}
                        onChange={handleSearchChange}
                        className="border-gray-200 bg-white pl-9 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                    />
                </div>

                {/* Gender policy filter */}
                <div className="w-full sm:w-44">
                    <Select
                        value={values.genderPolicy}
                        onValueChange={handlePolicyChange}
                    >
                        <SelectTrigger className="border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600">
                            <SelectValue placeholder="Any gender" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <SelectItem value="ALL">Any gender</SelectItem>
                            <SelectItem value="MALE_ONLY">Male Only</SelectItem>
                            <SelectItem value="FEMALE_ONLY">
                                Female Only
                            </SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Clear button */}
                {hasActiveFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
