import { useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPassowrdForm';

export default function ResetPassword() {
    const [params] = useSearchParams();

    const token = params.get('token') ?? '';
    const type = params.get('type') as 'activation' | 'reset';

    return <ResetPasswordForm token={token} type={type} />;
}
