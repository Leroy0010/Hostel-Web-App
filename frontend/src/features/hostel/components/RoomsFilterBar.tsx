import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { RoomFilterValues } from '@/features/room/hooks/useRoomFilters';

interface RoomFilterBarProps {
    filters: RoomFilterValues;
    onFiltersChange: (next: RoomFilterValues) => void;
}

/**
 * Inline room type + max-price filter bar for the hostel detail page.
 *
 * Controlled component — all state lives in the parent via {@link useRoomFilters}.
 * Filter changes reset pagination to page 0 inside the hook.
 *
 * Both filter values are passed directly to {@code GET /api/hostels/{id}}
 * as query params — **no client-side filtering** happens here.
 *
 * @example
 * ```tsx
 * const { filters, setFilters } = useRoomFilters(12);
 * <RoomFilterBar filters={filters} onFiltersChange={setFilters} />
 * ```
 */
export function RoomFilterBar({
    filters,
    onFiltersChange,
}: RoomFilterBarProps) {
    const hasActiveFilters =
        filters.roomType !== 'ALL' || filters.maxPrice !== '';

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Room type filter */}
            <div className="w-full sm:w-40">
                <Select
                    value={filters.roomType}
                    onValueChange={(val) =>
                        onFiltersChange({
                            ...filters,
                            roomType: val as RoomFilterValues['roomType'],
                        })
                    }
                >
                    <SelectTrigger className="w-full border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600">
                        <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <SelectItem value="ALL">Any type</SelectItem>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="DOUBLE">Double</SelectItem>
                        <SelectItem value="TRIPLE">Triple</SelectItem>
                        <SelectItem value="QUAD">Quad</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Max price filter */}
            <div className="relative max-w-xs">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                    ₵
                </span>
                <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Max price / semester"
                    value={filters.maxPrice}
                    onChange={(e) =>
                        onFiltersChange({
                            ...filters,
                            maxPrice: e.target.value,
                        })
                    }
                    className="border-gray-200 bg-white pl-7 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        onFiltersChange({ roomType: 'ALL', maxPrice: '' })
                    }
                    className="shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Clear
                </Button>
            )}
        </div>
    );
}
