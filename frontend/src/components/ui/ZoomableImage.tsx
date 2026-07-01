import { useState, useEffect, type ImgHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZoomableImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    /** Optional React node to display if the image fails to load */
    fallbackNode?: React.ReactNode;
}

export function ZoomableImage({
    src,
    alt,
    className = '',
    fallbackNode,
    ...rest
}: ZoomableImageProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Lock body scroll when the lightbox is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // If the image errors out, prevent opening the modal and show the fallback
    if (hasError && fallbackNode) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <img src='https://placehold.co/800x450/e5e7eb/9ca3af?text=No+Image' alt={alt} />
            </div>
        );
    }

    return (
        <>
            {/* ── Thumbnail ────────────────────────────────────────────── */}
            <img
                src={src}
                alt={alt}
                className={`cursor-pointer transition-opacity hover:opacity-80 ${className}`}
                onClick={() => setIsOpen(true)}
                onError={() => setHasError(true)}
                {...rest}
            />

            {/* ── Lightbox Portal ──────────────────────────────────────── */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[9999999999999999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                            >
                                <TransformWrapper
                                    initialScale={1}
                                    minScale={0.5}
                                    maxScale={4}
                                    centerOnInit
                                >
                                    {({ zoomIn, zoomOut, resetTransform }) => (
                                        <>
                                            {/* Floating Controls */}
                                            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-black/50 p-1.5 backdrop-blur-md">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                                                    onClick={() => zoomIn()}
                                                    title="Zoom In"
                                                >
                                                    <ZoomIn className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                                                    onClick={() => zoomOut()}
                                                    title="Zoom Out"
                                                >
                                                    <ZoomOut className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                                                    onClick={() =>
                                                        resetTransform()
                                                    }
                                                    title="Reset Zoom"
                                                >
                                                    <Maximize className="h-4 w-4" />
                                                </Button>
                                                <div className="mx-1 h-5 w-px bg-white/20" />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white hover:bg-red-500/80 hover:text-white"
                                                    onClick={() =>
                                                        setIsOpen(false)
                                                    }
                                                    title="Close"
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>

                                            {/* Zoomable Content Area */}
                                            <TransformComponent
                                                wrapperClass="!w-screen !h-screen"
                                                contentClass="!w-full !h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                                            >
                                                <img
                                                    src={src}
                                                    alt={alt}
                                                    className="max-h-[90vh] max-w-[95vw] object-contain shadow-2xl drop-shadow-2xl"
                                                    draggable={false}
                                                />
                                            </TransformComponent>
                                        </>
                                    )}
                                </TransformWrapper>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    );
}
