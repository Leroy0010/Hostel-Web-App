import { motion } from 'framer-motion';

/**
 * Animated inline field error message.
 * Extracted to reduce JSX nesting in the form above.
 */
export function FieldError({ message }: { message: string }) {
    return (
        <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium text-red-500 dark:text-red-400"
            role="alert"
        >
            {message}
        </motion.p>
    );
}
