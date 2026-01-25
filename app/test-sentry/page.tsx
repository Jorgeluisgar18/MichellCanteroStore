'use client';

export default function SentryTestPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-4">Sentry Test Page</h1>
            <button
                onClick={() => {
                    throw new Error("Sentry Test Error - Client Side");
                }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
                Trigger Client Error
            </button>
            <p className="mt-4 text-gray-600">
                Click the button to trigger an error and check your Sentry dashboard.
            </p>
        </div>
    );
}
