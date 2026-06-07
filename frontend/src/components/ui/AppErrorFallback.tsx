export const AppErrorFallback = ({
    error,
    resetError,
}: {
    error: Error;
    resetError: () => void;
}) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg
                    className="h-8 w-8 text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
                Application Error
            </h1>
            <p className="text-muted-foreground">
                Something went wrong while loading the application. Please try
                refreshing the page.
            </p>
            {import.meta.env.DEV && (
                <details className="rounded-lg bg-muted p-4 text-left">
                    <summary className="cursor-pointer font-medium">
                        Error Details
                    </summary>
                    <pre className="mt-2 overflow-auto text-sm text-muted-foreground">
                        {error.message}
                        {error.stack}
                    </pre>
                </details>
            )}
            <button
                onClick={resetError}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
                Try Again
            </button>
        </div>
    </div>
);
