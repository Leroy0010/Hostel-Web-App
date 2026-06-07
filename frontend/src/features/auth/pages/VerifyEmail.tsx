import { useSearchParams } from 'react-router-dom';

import { useVerifyEmail } from '../api/auth';
import { VerifyEmailStatus } from '../components/VerifyEmailStatus';

export default function VerifyEmail() {
    const [params] = useSearchParams();

    const token = params.get('token') ?? '';

    const { isPending, isSuccess, error } = useVerifyEmail({ token });

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
            <div className="w-full max-w-md rounded-xl border bg-white p-8 dark:bg-gray-950">
                <VerifyEmailStatus
                    isLoading={isPending}
                    isSuccess={isSuccess}
                    error={error?.message}
                />
            </div>
        </div>
    );
}
