import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                            <span className="text-4xl font-bold text-blue-600">
                                404
                            </span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        Page Not Found
                    </CardTitle>
                    <CardDescription>
                        The page you're looking for doesn't exist
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        The page you're looking for might have been moved,
                        deleted, or doesn't exist.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => navigate(-1)}
                            variant="outline"
                            className="flex-1"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Button>
                        <Button
                            onClick={() => navigate('/')}
                            className="flex-1"
                        >
                            <Home className="mr-2 h-4 w-4" />
                            Go Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
