'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function AuthError() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        const errorMessage = searchParams.get('message');
        if (errorMessage) {
            setError(decodeURIComponent(errorMessage));
        } else {
            setError('An unknown error occurred during authentication');
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md mx-auto">
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
                <p className="text-gray-600 mb-6">{error}</p>

                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
}
