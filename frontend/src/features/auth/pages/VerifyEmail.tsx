import { useSearchParams } from 'react-router-dom';
import { useVerifyEmail } from '../api/auth';
import { VerifyEmailStatus } from '../components/VerifyEmailStatus';

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';

    const { isPending, isSuccess, error } = useVerifyEmail({ token });

    return (
        <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-gray-50 px-4 transition-colors duration-200 dark:bg-gray-900">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <VerifyEmailStatus
                    isLoading={isPending}
                    isSuccess={isSuccess}
                    // Pass the whole ApiError object, not just the message
                    error={error}
                />
            </div>
        </div>
    );
}
