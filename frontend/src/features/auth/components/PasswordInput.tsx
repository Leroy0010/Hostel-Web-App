import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ComponentPropsWithoutRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PasswordInputProps = Omit<ComponentPropsWithoutRef<typeof Input>, 'type'>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Password input field with a show/hide visibility toggle button.
 *
 * Wraps Shadcn's {@link Input} so it integrates seamlessly with the
 * existing design system. All props except `type` are forwarded directly —
 * `type` is controlled internally and switches between `"password"` and
 * `"text"` based on the toggle state.
 *
 * Usage with React Hook Form:
 * ```tsx
 * <PasswordInput id="password" {...register('password')} />
 * ```
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        return (
            <div className="relative">
                <Input
                    {...props}
                    ref={ref}
                    type={showPassword ? 'text' : 'password'}
                    className={`pr-10 ${className ?? ''}`}
                />
                <button
                    type="button"
                    aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none dark:text-gray-500 dark:hover:text-gray-300"
                    tabIndex={-1} // Keep tab flow on the input itself
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                </button>
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';
