import { motion } from 'framer-motion';
import { useTypingEffect } from '../hooks/useTypingEffect'; // Adjust path as per feature structure
import bgImage from '@/assets/hostel-life-home-bg.jpg';

const PHRASES = [
    'Discover verified hostels.',
    'Book rooms effortlessly.',
    'Submit insightful reviews.',
    'File complaints with ease.',
    'Truly improve your student living experience.',
    'Find your perfect home away from home.',
];

export default function Home() {
    // Use the extracted custom hook
    const displayedText = useTypingEffect(PHRASES);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative flex h-full w-full items-center justify-center bg-gray-50 bg-cover bg-center bg-no-repeat transition-colors duration-200 dark:bg-gray-900"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            {/* Theme-Aware Overlay: 
        Uses white/80 for light mode, black/80 for dark mode with a blur 
        to ensure readability regardless of the background image behind it.
      */}
            {/* <div className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-colors duration-200 dark:bg-black/80"></div> */}
            <div className="absolute inset-0 bg-black opacity-70 transition-colors duration-200"></div>

            {/* Content Container */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-center"
            >
                <h1 className="mb-6 text-5xl font-extrabold text-gray-100 transition-colors duration-200 sm:text-6xl">
                    <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                        Welcome to HostelLife+
                    </span>
                </h1>

                <p className="mb-8 min-h-16 text-xl font-medium text-gray-300 transition-colors duration-200 sm:text-2xl">
                    {displayedText}
                    {/* Framer Motion Blinking Cursor */}
                    <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            ease: 'linear',
                        }}
                        className="ml-1 font-bold text-blue-600 dark:text-blue-400"
                    >
                        |
                    </motion.span>
                </p>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="mt-10 text-base text-gray-400 transition-colors duration-200 sm:text-lg dark:text-gray-400"
                >
                    Login or register to begin. You can explore available
                    hostels even without an account.
                </motion.p>
            </motion.div>
        </motion.div>
    );
}
