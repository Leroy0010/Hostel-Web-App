/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// 1. Import the new combobox parts.
// We alias 'Combobox' to 'BaseCombobox' so we can export our own 'Combobox'.
import {
    Combobox as BaseCombobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxChips,
    ComboboxChip,
    ComboboxChipsInput,
    ComboboxValue,
    useComboboxAnchor,
} from '@/components/ui/combobox';

export interface ComboboxOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface ComboboxProps {
    options: ComboboxOption[];
    value?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
    width?: string;
    mode?: 'single' | 'multiple';
    maxDisplay?: number;
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    emptyText = 'No option found.',
    disabled = false,
    className,
    width = 'w-70',
    mode = 'single',
    maxDisplay = 3,
}: ComboboxProps) {
    const isMultiSelect = mode === 'multiple';
    const anchor = useComboboxAnchor();

    // 2. Map the simple string/string[] values from the old API
    // to the full Object/Object[] format expected by the new Combobox.
    const controlledValue = React.useMemo(() => {
        if (value === undefined) return undefined;

        if (isMultiSelect) {
            const valArray = Array.isArray(value) ? value : [];
            return options.filter((opt) => valArray.includes(opt.value));
        }

        return options.find((opt) => opt.value === value) || null;
    }, [value, options, isMultiSelect]);

    // 3. Map the Object/Object[] from the new Combobox back to string/string[]
    // before emitting it to the parent components.
    const handleValueChange = (newValue: any) => {
        if (!onValueChange) return;

        if (isMultiSelect) {
            const newArray = (newValue as ComboboxOption[]) || [];
            onValueChange(newArray.map((item) => item.value));
        } else {
            onValueChange(newValue ? (newValue as ComboboxOption).value : '');
        }
    };

    return (
        <BaseCombobox
            modal={true}
            multiple={isMultiSelect}
            items={options}
            itemToStringValue={(option) => option.label}
            value={controlledValue}
            onValueChange={handleValueChange}
            disabled={disabled}
            autoHighlight
        >
            {isMultiSelect ? (
                // --- MULTIPLE SELECT MODE ---
                <ComboboxChips
                    ref={anchor}
                    className={cn('shrink-0', width, className)}
                >
                    <ComboboxValue>
                        {(selectedOptions: ComboboxOption[]) => {
                            // Fallback to placeholder if nothing is selected
                            if (
                                !selectedOptions ||
                                selectedOptions.length === 0
                            ) {
                                return (
                                    <React.Fragment>
                                        <span className="truncate pl-1 text-sm text-muted-foreground">
                                            {placeholder}
                                        </span>
                                        <ComboboxChipsInput
                                            placeholder={searchPlaceholder}
                                            className="ml-auto"
                                        />
                                    </React.Fragment>
                                );
                            }

                            // Reimplementing your exact maxDisplay logic
                            const displayOptions = selectedOptions.slice(
                                0,
                                maxDisplay
                            );
                            const remainingCount =
                                selectedOptions.length - maxDisplay;

                            return (
                                <React.Fragment>
                                    {displayOptions.map((option) => (
                                        <ComboboxChip key={option.value}>
                                            {option.label}
                                        </ComboboxChip>
                                    ))}
                                    {remainingCount > 0 && (
                                        <Badge
                                            variant="outline"
                                            className="mr-1 text-xs"
                                        >
                                            +{remainingCount} more
                                        </Badge>
                                    )}
                                    {/* The search input seamlessly sits next to the chips */}
                                    <ComboboxChipsInput
                                        placeholder={searchPlaceholder}
                                    />
                                </React.Fragment>
                            );
                        }}
                    </ComboboxValue>
                </ComboboxChips>
            ) : (
                // --- SINGLE SELECT MODE ---
                <div ref={anchor} className={cn('shrink-0', width, className)}>
                    <ComboboxInput
                        placeholder={placeholder}
                        showClear={!disabled}
                    />
                </div>
            )}

            {/* --- DROPDOWN CONTENT --- */}
            <ComboboxContent
                anchor={anchor}
                className={cn(width, 'p-0, pointer-events-auto')}
            >
                <ComboboxEmpty>{emptyText}</ComboboxEmpty>
                <ComboboxList>
                    {(option: ComboboxOption) => (
                        <ComboboxItem
                            key={option.value}
                            value={option}
                            disabled={option.disabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onPointerDownCapture={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {option.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </BaseCombobox>
    );
}
