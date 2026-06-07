// features/auth/components/VerifyEmailStatus.tsx

import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
    isLoading: boolean;
    isSuccess: boolean;
    error?: string;
}

export function VerifyEmailStatus({
    isLoading,
    isSuccess,
    error,
}: Props) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p>Verifying your email...</p>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p>Email verified successfully.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-red-500" />
            <p>{error}</p>
        </div>
    );
}