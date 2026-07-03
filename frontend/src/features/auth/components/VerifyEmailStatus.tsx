import { useState } from 'react';
import {
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Mail,
    ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { useResendVerificationMutation } from '../api/auth';
import type { ApiError } from '@/types/api';

interface Props {
    isLoading: boolean;
    isSuccess: boolean;
    error: ApiError | null;
}

export function VerifyEmailStatus({ isLoading, isSuccess, error }: Props) {
    const [email, setEmail] = useState('');
    const { mutate: resend, isPending: isResending } =
        useResendVerificationMutation();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Verifying your email
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please wait a moment while we securely verify your
                        token...
                    </p>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Email Verified
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your account is now active and ready to use.
                    </p>
                </div>
                <Button asChild className="w-full">
                    <Link to="/login">
                        Continue to Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        );
    }

    // --- REACTIVE RESEND: Expired Token UI ---
    if (error?.code === 'TOKEN_EXPIRED') {
        return (
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Verification Link Expired
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        For your security, links expire after 24 hours. Enter
                        your email below to request a new verification link.
                    </p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (email.trim()) resend({ email: email.trim() });
                    }}
                    className="w-full space-y-3 pt-2"
                >
                    <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="text-center"
                    />
                    <Button
                        type="submit"
                        disabled={isResending || !email.trim()}
                        className="w-full"
                    >
                        {isResending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Mail className="mr-2 h-4 w-4" />
                        )}
                        Request New Link
                    </Button>
                </form>
            </div>
        );
    }

    // --- Generic Error UI (Invalid token, malformed URL, etc) ---
    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Verification Failed
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {error?.message ||
                        'The verification link is invalid or malformed.'}
                </p>
            </div>
            <div className="w-full space-y-3 border-t border-gray-100 pt-2 dark:border-gray-800">
                <Button variant="outline" asChild className="w-full">
                    <Link to="/register">Create a new account</Link>
                </Button>
                <Button variant="ghost" asChild className="w-full">
                    <Link to="/login">Back to login</Link>
                </Button>
            </div>
        </div>
    );
}
