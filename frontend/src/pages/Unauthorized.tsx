import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <Shield className="h-8 w-8 text-red-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-red-600">
                        Access Denied
                    </CardTitle>
                    <CardDescription>
                        You don't have permission to access this page
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Contact your administrator if you believe this is an
                        error.
                    </p>
                    <Button onClick={() => navigate(-1)} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
