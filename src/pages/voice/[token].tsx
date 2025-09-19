import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon, PlayIcon } from '@heroicons/react/24/outline';

export default function VoiceNotePage() {
  const router = useRouter();
  const { token } = router.query;

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { // Max 60 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
      }
    }
  };

  const sendRecording = async () => {
    if (!audioBlob || !token) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.wav');
      formData.append('token', token as string);

      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Success - show confirmation
        setIsUploading(false);
        showSuccessMessage();
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to send voice note. Please try again.');
      setIsUploading(false);
    }
  };

  const showSuccessMessage = () => {
    // Replace the interface with success message
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #f9fafb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        ">
          <div style="
            width: 60px;
            height: 60px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-size: 24px;
          ">✓</div>
          <h1 style="font-size: 24px; margin-bottom: 12px; color: #111827;">Voice Note Sent!</h1>
          <p style="color: #6b7280; margin-bottom: 20px;">
            Thank you for your voice update. Our team will review it and follow up if needed.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            You can now close this page.
          </p>
        </div>
      </div>
    `;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Voice Update
          </h1>
          <p className="text-sm text-gray-600">
            Record a voice message about your recovery (max 60 seconds)
          </p>
          <p className="text-xs text-gray-500 mt-2">
            <strong>Privacy Note:</strong> Do not share personal information like SSN, DOB, or credit card details.
          </p>
        </div>

        <div className="space-y-6">
          {/* Recording interface */}
          <div className="text-center">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="w-20 h-20 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
                aria-label="Start recording"
              >
                <MicrophoneIcon className="h-8 w-8" />
              </button>
            )}

            {isRecording && (
              <div className="space-y-4">
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg animate-pulse"
                  aria-label="Stop recording"
                >
                  <StopIcon className="h-8 w-8" />
                </button>
                <div className="text-lg font-mono text-gray-700">
                  {formatTime(recordingTime)}
                </div>
                <div className="text-sm text-gray-500">
                  Recording... Tap to stop
                </div>
              </div>
            )}

            {audioBlob && !isUploading && (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={playRecording}
                    className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play recording'}
                  >
                    <PlayIcon className="h-5 w-5 text-gray-700" />
                  </button>
                  <div className="text-sm text-gray-600">
                    {formatTime(recordingTime)} voice note
                  </div>
                </div>

                <audio ref={audioRef} src={audioUrl} className="hidden" />

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl('');
                      setRecordingTime(0);
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={sendRecording}
                    className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-sm text-gray-600">Sending your voice note...</div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for a good voice note:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Speak clearly and at normal volume</li>
              <li>• Mention your pain level (0-10)</li>
              <li>• Describe any bleeding or swelling</li>
              <li>• Share any concerns or questions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}