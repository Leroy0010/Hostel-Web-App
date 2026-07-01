import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ratingLabel } from '../utils/review.utils';

// =============================================================================
// Display-only variant
// =============================================================================

interface StarDisplayProps {
    /** Rating value 1-5 (fractional values supported for display). */
    rating: number;
    /** Renders smaller stars when true. */
    size?: 'sm' | 'md' | 'lg';
    /** Show the numeric rating label alongside the stars. */
    showLabel?: boolean;
    className?: string;
}

/**
 * Display-only star rating row.
 * Filled stars use amber, empty stars use muted gray — works in both themes.
 *
 * @example
 * ```tsx
 * <StarDisplay rating={4.3} size="sm" showLabel />
 * ```
 */
export function StarDisplay({
    rating,
    size = 'md',
    showLabel = false,
    className,
}: StarDisplayProps) {
    const sizeClass = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    }[size];

    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    aria-hidden="true"
                    className={cn(
                        sizeClass,
                        'shrink-0 transition-colors duration-100',
                        i < Math.round(rating)
                            ? 'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300'
                            : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                    )}
                />
            ))}
            {showLabel && (
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
}

// =============================================================================
// Interactive variant
// =============================================================================

interface StarInputProps {
    /** Controlled rating value (0 = none selected). */
    value: number;
    /** Called when the user clicks a star. */
    onChange: (rating: number) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Interactive star rating input for forms.
 *
 * Accessible: each star is a focusable button with an aria-label.
 * Hover state previews the new rating; click commits it.
 * Keyboard support: Tab to each star, Enter/Space to select.
 *
 * @example In react-hook-form:
 * ```tsx
 * <Controller
 *   control={control}
 *   name="rating"
 *   render={({ field }) => (
 *     <StarInput value={field.value ?? 0} onChange={field.onChange} />
 *   )}
 * />
 * ```
 */
export function StarInput({
    value,
    onChange,
    disabled = false,
    className,
}: StarInputProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const displayRating = hovered !== null ? hovered + 1 : value;

    return (
        <div
            className={cn('flex items-center gap-1', className)}
            role="group"
            aria-label="Rating"
        >
            {Array.from({ length: 5 }).map((_, i) => (
                <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1} star${i === 0 ? '' : 's'}`}
                    aria-pressed={value === i + 1}
                    disabled={disabled}
                    onMouseEnter={() => !disabled && setHovered(i)}
                    onMouseLeave={() => !disabled && setHovered(null)}
                    onClick={() => !disabled && onChange(i + 1)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                            e.preventDefault();
                            onChange(i + 1);
                        }
                    }}
                    className={cn(
                        'rounded-sm p-0.5 transition-transform duration-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none',
                        !disabled && 'cursor-pointer hover:scale-110',
                        disabled && 'cursor-not-allowed opacity-60'
                    )}
                >
                    <Star
                        className={cn(
                            'h-7 w-7 transition-colors duration-100',
                            i < displayRating
                                ? 'fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300'
                                : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                        )}
                        aria-hidden="true"
                    />
                </button>
            ))}

            {/* Descriptive label next to stars */}
            {displayRating > 0 && (
                <span className="ml-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                    {ratingLabel(displayRating)}
                </span>
            )}
        </div>
    );
}
