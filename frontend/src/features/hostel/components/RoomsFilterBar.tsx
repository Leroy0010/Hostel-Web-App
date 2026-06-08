import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { RoomFilterValues } from '@/features/room/hooks/useRoomFilters';

/**
 * Inline room type + max-price filter bar.
 * Kept internal because it's specific to this page's room filtering UX.
 */
export function RoomFilterBar({
    filters,
    onFiltersChange,
}: {
    filters: RoomFilterValues;
    onFiltersChange: (v: RoomFilterValues) => void;
}) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Room type filter */}
            <div className="w-full sm:w-44">
                <Select
                    value={filters.roomType}
                    onValueChange={(val: string) =>
                        onFiltersChange({
                            ...filters,
                            roomType: val as RoomFilterValues['roomType'],
                        })
                    }
                >
                    <SelectTrigger className="border-gray-200 bg-white text-gray-900 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-600">
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
            <div className="relative max-w-sm">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                    ₵
                </span>
                <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Max price per semester"
                    value={filters.maxPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onFiltersChange({
                            ...filters,
                            maxPrice: e.target.value,
                        })
                    }
                    className="border-gray-200 bg-white pl-7 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-gray-600"
                />
            </div>
        </div>
    );
}
