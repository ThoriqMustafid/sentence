import { Head, Link } from '@inertiajs/react';
import SpeechTranslatorApp from '@/Components/SpeechTranslatorApp';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Real-time Speech Translation" />
            <div className="min-h-screen bg-gray-50 text-gray-900">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <header className="flex items-center justify-between py-6 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-sm">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-900">
                                LinguaBridge
                            </span>
                        </div>
                        <nav className="flex items-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition"
                                >
                                    Workspace
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    {/* Hero Section */}
                    <div className="py-8 text-center max-w-3xl mx-auto">
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Transkripsi & Terjemahan Suara Real-Time
                        </h1>
                        <p className="mt-3 text-base text-gray-500">
                            Pecahkan kendala bahasa dalam rapat, rapat kerja, atau belajar kelompok secara instan.
                        </p>
                    </div>

                    {/* Main Workspace Component */}
                    <div className="pb-12">
                        <SpeechTranslatorApp auth={auth} />
                    </div>
                </div>
            </div>
        </>
    );
}
