import { useEffect, useRef, useState } from 'react';

export function useSpeechRecognition({ lang = 'id-ID', onFinalSegment } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const shouldListenRef = useRef(false);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = lang;

        rec.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        rec.onerror = (event) => {
            console.error('Speech recognition error', event);
            setError(event.error);
            if (event.error === 'not-allowed') {
                shouldListenRef.current = false;
                setIsListening(false);
            }
        };

        rec.onend = () => {
            if (shouldListenRef.current) {
                try {
                    rec.start();
                } catch (e) {
                    console.error('Failed to restart recognition', e);
                }
            } else {
                setIsListening(false);
                setInterimTranscript('');
            }
        };

        rec.onresult = (event) => {
            let interim = '';
            let newlyFinalized = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    newlyFinalized += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (newlyFinalized) {
                setFinalTranscript((prev) => {
                    const separator = prev ? ' ' : '';
                    return prev + separator + newlyFinalized.trim();
                });
                if (onFinalSegment) {
                    onFinalSegment(newlyFinalized.trim());
                }
            }

            setInterimTranscript(interim);
        };

        recognitionRef.current = rec;

        return () => {
            shouldListenRef.current = false;
            rec.abort();
        };
    }, [lang, onFinalSegment]);

    const startListening = () => {
        if (!isSupported) return;
        shouldListenRef.current = true;
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
            }
        }
    };

    const stopListening = () => {
        shouldListenRef.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    };

    const resetTranscript = () => {
        setFinalTranscript('');
        setInterimTranscript('');
    };

    return {
        isListening,
        interimTranscript,
        finalTranscript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        setFinalTranscript,
    };
}
