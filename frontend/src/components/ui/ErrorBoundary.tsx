import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-100 items-center justify-center p-6">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="space-y-4">
                            <div>
                                <h3 className="font-semibold">
                                    Something went wrong
                                </h3>
                                <p className="mt-1 text-sm">
                                    An unexpected error occurred. Please try
                                    refreshing the page.
                                </p>
                                {import.meta.env.DEV && this.state.error && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-sm font-medium">
                                            Error Details
                                        </summary>
                                        <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
                                            {this.state.error.message}
                                            {this.state.error.stack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={this.handleReset}
                                className="w-full"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            );
        }

        return this.props.children;
    }
}

// Hook version for functional components
// eslint-disable-next-line react-refresh/only-export-components
export function useErrorHandler() {
    return (error: Error, errorInfo?: ErrorInfo) => {
        console.error('Error caught by useErrorHandler:', error, errorInfo);
        // You can add additional error reporting logic here
    };
}
