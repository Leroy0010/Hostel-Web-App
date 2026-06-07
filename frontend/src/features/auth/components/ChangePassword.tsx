// features/auth/components/ChangePasswordForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    changePasswordSchema,
    type ChangePasswordForm,
} from '../types';

import { useChangePasswordMutation } from '../api/auth';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function ChangePasswordForm() {
    const mutation = useChangePasswordMutation();

    const form = useForm<ChangePasswordForm>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
        },
    });

    const onSubmit = (data: ChangePasswordForm) => {
        mutation.mutate(data);

        form.reset();
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Input
                type="password"
                placeholder="Current Password"
                {...form.register('currentPassword')}
            />

            <Input
                type="password"
                placeholder="New Password"
                {...form.register('newPassword')}
            />

            <Button type="submit" disabled={mutation.isPending}>
                Change Password
            </Button>
        </form>
    );
}
