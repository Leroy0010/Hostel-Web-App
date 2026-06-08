import { useState, useEffect } from 'react';

export function useTypingEffect(
    phrases: string[],
    typingSpeed = 70,
    deletingSpeed = 40,
    pauseAfterTyping = 1500,
    pauseAfterDeleting = 700
) {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentPhrase = phrases[currentPhraseIndex];
        let timeoutId: ReturnType<typeof setTimeout>;

        if (!isDeleting && charIndex < currentPhrase.length) {
            timeoutId = setTimeout(() => {
                setDisplayedText(
                    (prev) => prev + currentPhrase.charAt(charIndex)
                );
                setCharIndex((prev) => prev + 1);
            }, typingSpeed);
        } else if (!isDeleting && charIndex === currentPhrase.length) {
            timeoutId = setTimeout(() => {
                setIsDeleting(true);
            }, pauseAfterTyping);
        } else if (isDeleting && charIndex > 0) {
            timeoutId = setTimeout(() => {
                setDisplayedText((prev) => prev.slice(0, prev.length - 1));
                setCharIndex((prev) => prev - 1);
            }, deletingSpeed);
        } else if (isDeleting && charIndex === 0) {
            timeoutId = setTimeout(() => {
                setIsDeleting(false);
                setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
            }, pauseAfterDeleting);
        }

        return () => clearTimeout(timeoutId);
    }, [
        currentPhraseIndex,
        charIndex,
        isDeleting,
        phrases,
        typingSpeed,
        deletingSpeed,
        pauseAfterTyping,
        pauseAfterDeleting,
    ]);

    return displayedText;
}
