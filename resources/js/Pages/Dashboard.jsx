import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SpeechTranslatorApp from '@/Components/SpeechTranslatorApp';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Speech & Translation Workspace
                </h2>
            }
        >
            <Head title="Workspace" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <SpeechTranslatorApp auth={auth} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
