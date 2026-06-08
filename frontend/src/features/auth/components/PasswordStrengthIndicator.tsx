import { useMemo } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
    level: StrengthLevel;
    score: number; // 0-4
    label: string;
    color: string;
    darkColor: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Evaluates password strength based on the same rules as `strongPasswordSchema`.
 *
 * Scoring (each rule adds 1 point):
 *  1. Length ≥ 8
 *  2. Contains uppercase letter
 *  3. Contains lowercase letter
 *  4. Contains digit
 *  5. Contains special character
 *
 * Score → Level:
 *  0-1 → weak | 2 → fair | 3 → good | 4-5 → strong
 */
function evaluatePassword(password: string): StrengthResult {
    if (!password) {
        return {
            level: 'empty',
            score: 0,
            label: '',
            color: '',
            darkColor: '',
        };
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1)
        return {
            level: 'weak',
            score,
            label: 'Weak',
            color: 'bg-red-500',
            darkColor: 'dark:bg-red-500',
        };
    if (score === 2)
        return {
            level: 'fair',
            score,
            label: 'Fair',
            color: 'bg-amber-400',
            darkColor: 'dark:bg-amber-400',
        };
    if (score === 4 || score === 3)
        return {
            level: 'good',
            score,
            label: 'Good',
            color: 'bg-blue-500',
            darkColor: 'dark:bg-blue-400',
        };
    return {
        level: 'strong',
        score,
        label: 'Strong',
        color: 'bg-green-500',
        darkColor: 'dark:bg-green-400',
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PasswordStrengthIndicatorProps {
    password: string;
}

/**
 * Visual password strength meter.
 *
 * Renders four animated bars that fill progressively as the password
 * satisfies more strength criteria. Used in the student registration form.
 *
 * @param password - The raw password string to evaluate (from the form field).
 */
export function PasswordStrengthIndicator({
    password,
}: PasswordStrengthIndicatorProps) {
    const result = useMemo(() => evaluatePassword(password), [password]);

    if (result.level === 'empty') return null;

    // Number of filled bars = min(score, 5) to keep it to 4 visual segments
    const filledBars = Math.min(result.score, 5);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
        >
            {/* Bar segments */}
            <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="h-1 flex-1 rounded-full bg-gray-200 dark:bg-gray-700"
                        initial={false}
                    >
                        <motion.div
                            className={`h-full rounded-full ${result.color} ${result.darkColor}`}
                            initial={{ width: '0%' }}
                            animate={{ width: i < filledBars ? '100%' : '0%' }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Label */}
            <p
                className={`text-xs font-medium ${
                    result.level === 'weak'
                        ? 'text-red-500 dark:text-red-400'
                        : result.level === 'fair'
                          ? 'text-amber-500 dark:text-amber-400'
                          : result.level === 'good'
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                }`}
            >
                {result.label} password
            </p>
        </motion.div>
    );
}
