import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '@/Hooks/useSpeechRecognition';
import axios from 'axios';

const SUPPORTED_LANGUAGES = [
    { code: 'id-ID', name: 'Bahasa Indonesia' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'ja-JP', name: '日本語 (Japanese)' },
    { code: 'zh-CN', name: '中文 (Chinese)' },
    { code: 'ar-SA', name: 'العربية (Arabic)' },
    { code: 'es-ES', name: 'Español (Spanish)' },
    { code: 'fr-FR', name: 'Français (French)' },
    { code: 'de-DE', name: 'Deutsch (German)' }
];

export default function SpeechTranslatorApp({ auth }) {
    const [title, setTitle] = useState('');
    const [segments, setSegments] = useState([]);
    const [sourceLang, setSourceLang] = useState('id-ID');
    const [targetLang, setTargetLang] = useState('en-US');
    const [history, setHistory] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [notification, setNotification] = useState(null);

    const originalEndRef = useRef(null);
    const translatedEndRef = useRef(null);

    // Toast notification helper
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Smart language selector toggle
    const handleSourceLangChange = (e) => {
        const newLang = e.target.value;
        setSourceLang(newLang);
        // Automatically swap defaults if applicable
        if (newLang === 'id-ID' && targetLang === 'id-ID') {
            setTargetLang('en-US');
        } else if (newLang === 'en-US' && targetLang === 'en-US') {
            setTargetLang('id-ID');
        }
    };

    // Callback when a Speech Segment is finalized
    const handleFinalSegment = async (text) => {
        if (!text.trim()) return;

        const segmentId = Date.now() + Math.random().toString(36).substr(2, 9);
        
        // Add to original segments
        setSegments((prev) => [
            ...prev,
            { id: segmentId, original: text, translated: 'Translating...' }
        ]);

        try {
            const response = await axios.post('/api/translate', {
                text: text,
                source: sourceLang,
                target: targetLang
            });

            const translatedText = response.data.translated_text;

            setSegments((prev) =>
                prev.map((seg) =>
                    seg.id === segmentId ? { ...seg, translated: translatedText } : seg
                )
            );
        } catch (error) {
            console.error('Translation error:', error);
            setSegments((prev) =>
                prev.map((seg) =>
                    seg.id === segmentId ? { ...seg, translated: '[Error translating segment]' } : seg
                )
            );
        }
    };

    const {
        isListening,
        interimTranscript,
        finalTranscript,
        error: speechError,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        setFinalTranscript
    } = useSpeechRecognition({
        lang: sourceLang,
        onFinalSegment: handleFinalSegment
    });

    // Auto scroll refs
    useEffect(() => {
        originalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [segments, interimTranscript]);

    useEffect(() => {
        translatedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [segments]);

    // Fetch session history on mount or auth change
    useEffect(() => {
        loadHistory();
    }, [auth]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        if (auth?.user) {
            try {
                const response = await axios.get('/api/transcripts');
                setHistory(response.data);
            } catch (err) {
                console.error('Failed to load history from DB:', err);
                loadFromLocalStorage();
            }
        } else {
            loadFromLocalStorage();
        }
        setIsLoadingHistory(false);
    };

    const loadFromLocalStorage = () => {
        try {
            const localData = localStorage.getItem('guest_transcripts');
            if (localData) {
                setHistory(JSON.parse(localData));
            } else {
                setHistory([]);
            }
        } catch (err) {
            console.error('LocalStorage load failed:', err);
        }
    };

    const handleStartStop = () => {
        if (isListening) {
            stopListening();
            showNotification('Recording paused. Review or save your transcript.', 'info');
        } else {
            // If loading a new clean session, reset transcript
            if (!selectedSessionId && segments.length === 0) {
                resetTranscript();
            }
            startListening();
            showNotification('Listening to microphone...', 'info');
        }
    };

    const handleClear = () => {
        if (window.confirm('Apakah Anda yakin ingin menghapus transkrip saat ini?')) {
            resetTranscript();
            setSegments([]);
            setSelectedSessionId(null);
            setTitle('');
            showNotification('Workspace cleared.', 'info');
        }
    };

    const handleSaveSession = async () => {
        if (segments.length === 0) {
            showNotification('Tidak ada transkrip untuk disimpan.', 'warning');
            return;
        }

        setIsSaving(true);
        const sessionTitle = title.trim() || `Session - ${new Date().toLocaleString('id-ID')}`;

        const payload = {
            title: sessionTitle,
            original_text: JSON.stringify(segments),
            translated_text: JSON.stringify(segments), // Stored full segment mappings for easy reload
            source_lang: sourceLang,
            target_lang: targetLang
        };

        if (auth?.user) {
            try {
                // Save to database
                const response = await axios.post('/api/transcripts', payload);
                showNotification('Sesi berhasil disimpan ke cloud database!');
                setSelectedSessionId(response.data.id);
                loadHistory();
            } catch (err) {
                console.error('Database save failed, falling back to LocalStorage', err);
                saveToLocalStorage(sessionTitle, payload);
            }
        } else {
            saveToLocalStorage(sessionTitle, payload);
        }
        setIsSaving(false);
    };

    const saveToLocalStorage = (sessionTitle, payload) => {
        try {
            const localData = localStorage.getItem('guest_transcripts');
            let list = localData ? JSON.parse(localData) : [];
            
            const newSession = {
                id: 'local_' + Date.now(),
                title: sessionTitle,
                original_text: payload.original_text,
                translated_text: payload.translated_text,
                source_lang: payload.source_lang,
                target_lang: payload.target_lang,
                created_at: new Date().toISOString()
            };

            // If updating existing local session
            if (selectedSessionId && String(selectedSessionId).startsWith('local_')) {
                list = list.map(item => item.id === selectedSessionId ? { ...newSession, id: selectedSessionId } : item);
                showNotification('Sesi lokal berhasil diperbarui!');
            } else {
                list.unshift(newSession);
                setSelectedSessionId(newSession.id);
                showNotification('Sesi berhasil disimpan di browser local storage!');
            }

            localStorage.setItem('guest_transcripts', JSON.stringify(list));
            setHistory(list);
        } catch (err) {
            console.error('LocalStorage save failed:', err);
            showNotification('Gagal menyimpan sesi ke browser.', 'error');
        }
    };

    const handleSelectSession = (session) => {
        setSelectedSessionId(session.id);
        setTitle(session.title);
        setSourceLang(session.source_lang);
        setTargetLang(session.target_lang);
        
        try {
            const parsedSegments = JSON.parse(session.original_text);
            if (Array.isArray(parsedSegments)) {
                setSegments(parsedSegments);
            } else {
                // Fallback if saved as plain text
                setSegments([{ id: '1', original: session.original_text, translated: session.translated_text }]);
            }
        } catch (e) {
            // Text fallback
            setSegments([{ id: '1', original: session.original_text, translated: session.translated_text }]);
        }
        resetTranscript();
        showNotification(`Memuat sesi: ${session.title}`, 'info');
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!window.confirm('Hapus sesi ini secara permanen?')) return;

        if (auth?.user && !String(sessionId).startsWith('local_')) {
            try {
                await axios.delete(`/api/transcripts/${sessionId}`);
                showNotification('Sesi berhasil dihapus.');
                if (selectedSessionId === sessionId) {
                    setSegments([]);
                    setSelectedSessionId(null);
                    setTitle('');
                }
                loadHistory();
            } catch (err) {
                console.error('Failed to delete session:', err);
                showNotification('Gagal menghapus sesi.', 'error');
            }
        } else {
            try {
                const localData = localStorage.getItem('guest_transcripts');
                if (localData) {
                    let list = JSON.parse(localData);
                    list = list.filter(item => item.id !== sessionId);
                    localStorage.setItem('guest_transcripts', JSON.stringify(list));
                    setHistory(list);
                    showNotification('Sesi lokal berhasil dihapus.');
                    if (selectedSessionId === sessionId) {
                        setSegments([]);
                        setSelectedSessionId(null);
                        setTitle('');
                    }
                }
            } catch (err) {
                console.error('LocalStorage delete failed:', err);
            }
        }
    };

    const startNewSession = () => {
        resetTranscript();
        setSegments([]);
        setSelectedSessionId(null);
        setTitle('');
        showNotification('Sesi baru dimulai.', 'info');
    };

    // Exports
    const handleExportTXT = () => {
        if (segments.length === 0) {
            showNotification('Tidak ada konten transkrip untuk diexport.', 'warning');
            return;
        }

        const lines = [
            `=========================================`,
            ` TRANSCRIPT: ${title || 'Untitled Session'}`,
            ` Date: ${new Date().toLocaleString('id-ID')}`,
            ` Source Language: ${sourceLang}`,
            ` Target Language: ${targetLang}`,
            `=========================================`,
            ''
        ];

        segments.forEach((seg, index) => {
            lines.push(`[${index + 1}] ORIGINAL (${sourceLang}):`);
            lines.push(seg.original);
            lines.push(`[${index + 1}] TRANSLATION (${targetLang}):`);
            lines.push(seg.translated);
            lines.push('-----------------------------------------');
        });

        const fileContent = lines.join('\n');
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const element = document.createElement('a');
        element.href = URL.createObjectURL(blob);
        element.download = `${title.replace(/\s+/g, '_') || 'transcript'}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        showNotification('Transcript exported as TXT!');
    };

    const handleExportPDF = () => {
        if (segments.length === 0) {
            showNotification('Tidak ada konten transkrip untuk diexport.', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('Popup terblokir oleh browser. Harap izinkan pop-up.', 'error');
            return;
        }

        const titleText = title || 'Speech Translation Transcript';
        const dateText = new Date().toLocaleString('id-ID');

        const rowsHTML = segments.map((seg, idx) => `
            <div class="segment-row">
                <div class="segment-number">${idx + 1}</div>
                <div class="segment-original">${seg.original}</div>
                <div class="segment-translated">${seg.translated}</div>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>${titleText}</title>
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Arial, sans-serif;
                            color: #333;
                            padding: 40px;
                            line-height: 1.6;
                        }
                        .header {
                            border-bottom: 2px solid #eaeaea;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .header h1 {
                            font-size: 24px;
                            margin: 0 0 10px 0;
                            color: #1a202c;
                        }
                        .meta-info {
                            font-size: 14px;
                            color: #718096;
                        }
                        .table-header {
                            display: flex;
                            font-weight: bold;
                            border-bottom: 2px solid #cbd5e0;
                            padding-bottom: 10px;
                            margin-bottom: 15px;
                            color: #4a5568;
                        }
                        .col-num { width: 8%; text-align: center; }
                        .col-orig { width: 46%; padding-right: 15px; }
                        .col-tran { width: 46%; padding-left: 15px; border-left: 1px solid #e2e8f0; }
                        .segment-row {
                            display: flex;
                            border-bottom: 1px solid #edf2f7;
                            padding: 15px 0;
                            page-break-inside: avoid;
                        }
                        .segment-number {
                            width: 8%;
                            text-align: center;
                            font-weight: bold;
                            color: #a0aec0;
                        }
                        .segment-original {
                            width: 46%;
                            padding-right: 15px;
                            font-size: 15px;
                        }
                        .segment-translated {
                            width: 46%;
                            padding-left: 15px;
                            font-size: 15px;
                            color: #2b6cb0;
                            border-left: 1px solid #e2e8f0;
                        }
                        @media print {
                            body { padding: 20px; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${titleText}</h1>
                        <div class="meta-info">
                            <div>Tanggal: ${dateText}</div>
                            <div>Bahasa Asal: ${SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang} &rarr; Bahasa Terjemahan: ${SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang}</div>
                        </div>
                    </div>
                    
                    <div class="table-header">
                        <div class="col-num">#</div>
                        <div class="col-orig">Teks Asli (${sourceLang})</div>
                        <div class="col-tran">Terjemahan (${targetLang})</div>
                    </div>
                    
                    <div class="segments-list">
                        ${rowsHTML}
                    </div>

                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        showNotification('Transcript sent to PDF print preview!');
    };

    return (
        <div className="flex h-[calc(100vh-140px)] flex-col gap-6 lg:flex-row">
            {/* Sidebar (History & Past Sessions) */}
            <div className="flex w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:w-80">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Riwayat Transkrip</h3>
                    <button
                        onClick={startNewSession}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition"
                        title="Sesi Baru"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[250px] lg:max-h-none">
                    {isLoadingHistory ? (
                        <div className="py-4 text-center text-sm text-gray-500">Memuat riwayat...</div>
                    ) : history.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">
                            Belum ada riwayat transkrip yang disimpan.
                        </div>
                    ) : (
                        history.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => handleSelectSession(session)}
                                className={`group flex items-center justify-between cursor-pointer rounded-lg border p-3 transition ${
                                    selectedSessionId === session.id
                                        ? 'border-indigo-500 bg-indigo-50/50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-700 truncate">{session.title}</h4>
                                    <span className="text-xs text-gray-400">
                                        {new Date(session.created_at || session.id.split('_')[1]).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition p-1 rounded hover:bg-gray-100"
                                    title="Hapus"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
                {!auth?.user && (
                    <div className="mt-4 border-t border-gray-100 pt-3 text-center">
                        <span className="text-xs text-indigo-500 font-medium">
                            💡 Login untuk menyimpan sesi Anda secara permanen di cloud.
                        </span>
                    </div>
                )}
            </div>

            {/* Main Translating Area */}
            <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                
                {/* Control Panel (Title & Language Selectors) */}
                <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Judul Sesi (contoh: Rapat Mingguan)..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border-none p-0 text-lg font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            {isListening ? (
                                <span className="flex items-center text-red-500 font-medium">
                                    <span className="mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 inline-block"></span>
                                    Mendengarkan aktif...
                                </span>
                            ) : (
                                <span>Mikrofon nonaktif. Siap merekam.</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                            <select
                                value={sourceLang}
                                onChange={handleSourceLangChange}
                                className="border-none bg-transparent py-0.5 text-sm font-medium text-gray-700 focus:ring-0 focus:outline-none cursor-pointer pr-8"
                            >
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                            
                            <span className="text-gray-400">&rarr;</span>

                            <select
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value)}
                                className="border-none bg-transparent py-0.5 text-sm font-medium text-gray-700 focus:ring-0 focus:outline-none cursor-pointer pr-8"
                            >
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Speech API browser check */}
                        {!isSupported && (
                            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">
                                Web Speech API tidak didukung di browser ini. Gunakan Chrome/Edge.
                            </span>
                        )}
                    </div>
                </div>

                {/* Dual-Pane View */}
                <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden md:grid-cols-2">
                    {/* Left Pane (Original Voice Text) */}
                    <div className="flex flex-col rounded-xl border border-gray-150 bg-gray-50/50 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wider text-gray-500 uppercase">
                            <span>Teks Asli</span>
                            <span className="text-[10px] text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded">
                                {SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.name}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-gray-800 text-lg leading-relaxed scrollbar-thin">
                            {segments.map((seg) => (
                                <div key={seg.id} className="p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm transition hover:shadow">
                                    {seg.original}
                                </div>
                            ))}

                            {/* Interim Results */}
                            {interimTranscript && (
                                <div className="p-2.5 rounded-lg bg-white border border-dashed border-gray-300 text-gray-400 italic">
                                    {interimTranscript}
                                </div>
                            )}

                            {segments.length === 0 && !interimTranscript && (
                                <div className="flex h-full flex-col items-center justify-center text-center py-20 text-gray-400 text-sm">
                                    <svg className="h-10 w-10 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    <span>Tekan tombol "Mulai" dan mulailah berbicara.</span>
                                </div>
                            )}
                            <div ref={originalEndRef} />
                        </div>
                    </div>

                    {/* Right Pane (Translated Text) */}
                    <div className="flex flex-col rounded-xl border border-blue-100 bg-blue-50/10 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wider text-blue-600/70 uppercase">
                            <span>Terjemahan Real-Time</span>
                            <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-blue-900 text-lg leading-relaxed scrollbar-thin">
                            {segments.map((seg) => (
                                <div key={seg.id} className={`p-2.5 rounded-lg bg-white border shadow-sm transition hover:shadow ${
                                    seg.translated === 'Translating...' ? 'border-dashed border-indigo-200 text-indigo-400' : 'border-blue-50'
                                }`}>
                                    {seg.translated === 'Translating...' ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 inline-block [animation-delay:-0.3s]"></span>
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 inline-block [animation-delay:-0.15s]"></span>
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 inline-block"></span>
                                            Menerjemahkan...
                                        </span>
                                    ) : (
                                        seg.translated
                                    )}
                                </div>
                            ))}

                            {interimTranscript && (
                                <div className="p-2.5 rounded-lg bg-white border border-dashed border-blue-100 text-blue-400/50 italic text-sm">
                                    Mendengarkan kalimat asli...
                                </div>
                            )}

                            {segments.length === 0 && !interimTranscript && (
                                <div className="flex h-full items-center justify-center text-center py-20 text-blue-400/40 text-sm">
                                    <span>Hasil terjemahan akan tampil berdampingan di sini.</span>
                                </div>
                            )}
                            <div ref={translatedEndRef} />
                        </div>
                    </div>
                </div>

                {/* Speech Error Banner */}
                {speechError && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                            {speechError === 'not-allowed'
                                ? 'Izin akses mikrofon ditolak. Silakan aktifkan izin mikrofon di pengaturan browser Anda.'
                                : `Kesalahan mikrofon: ${speechError}`}
                        </span>
                    </div>
                )}

                {/* Footer Controls (Record, Clear, Save, Export) */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleStartStop}
                            disabled={!isSupported}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all focus:outline-none ${
                                !isSupported
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : isListening
                                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow text-white'
                            }`}
                        >
                            {isListening ? (
                                <>
                                    <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                                        <rect width="12" height="12" x="6" y="6" rx="1.5" />
                                    </svg>
                                    <span>Selesai Bicara</span>
                                </>
                            ) : (
                                <>
                                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    <span>Mulai Berbicara</span>
                                </>
                            )}
                        </button>

                        {(segments.length > 0 || interimTranscript) && (
                            <button
                                onClick={handleClear}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200/80 px-3.5 py-2.5 rounded-full transition"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {segments.length > 0 && (
                            <>
                                <button
                                    onClick={handleSaveSession}
                                    disabled={isSaving}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-full shadow-sm hover:shadow transition disabled:opacity-50"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Sesi'}</span>
                                </button>

                                <button
                                    onClick={handleExportTXT}
                                    className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-4 py-2.5 rounded-full transition"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>TXT</span>
                                </button>

                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-4 py-2.5 rounded-full transition"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    <span>PDF (Cetak)</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg text-white transition-all transform duration-300 translate-y-0 ${
                    notification.type === 'success'
                        ? 'bg-emerald-500'
                        : notification.type === 'warning'
                        ? 'bg-amber-500'
                        : notification.type === 'error'
                        ? 'bg-red-500'
                        : 'bg-indigo-500'
                }`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
}
