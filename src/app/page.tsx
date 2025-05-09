'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function VeganAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize camera when component mounts
  useEffect(() => {
    if (showCamera && !streamRef.current) {
      startCamera();
    }
  }, [showCamera]);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);
      
      // First check if we have media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API de câmera não disponível neste navegador');
      }

      // Request camera access with specific constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      console.log('Solicitando acesso à câmera com restrições:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream da câmera obtido:', stream);
      
      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado');
      }

      const video = videoRef.current;
      video.srcObject = stream;
      
      // Wait for the video to be ready
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play()
            .then(() => resolve(true))
            .catch(reject);
        };
        video.onerror = reject;
      });

      streamRef.current = stream;
      console.log('Câmera iniciada com sucesso');
    } catch (err) {
      const error = err as Error;
      console.error('Erro na câmera:', error);
      let errorMessage = 'Não foi possível acessar a câmera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Por favor, certifique-se de que você concedeu permissões para a câmera.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Nenhuma câmera encontrada no seu dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'A câmera já está em uso por outro aplicativo.';
      } else {
        errorMessage += error.message;
      }
      
      setCameraError(errorMessage);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const handleCameraButtonClick = () => {
    if (showCamera) {
      stopCamera();
    } else {
      setShowCamera(true);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) {
      setError('Câmera não está pronta');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Não foi possível obter o contexto do canvas');
      }

      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/png');
      console.log('Foto capturada com sucesso');
      setImage(imageData);
      stopCamera();
    } catch (err) {
      const error = err as Error;
      console.error('Erro na captura:', error);
      setError('Falha ao capturar foto: ' + error.message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, envie um arquivo de imagem');
        return;
      }

      if (!SUPPORTED_FORMATS.includes(file.type)) {
        setError(`Formato de imagem não suportado. Por favor, use um dos seguintes: ${SUPPORTED_FORMATS.join(', ')}`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            // Convert to PNG format for better quality
            const imageData = canvas.toDataURL('image/png');
            setImage(imageData);
            setResult(null);
            setError(null);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao analisar a imagem');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 font-['Poppins']">
            🌱 É vegano?
          </h1>
        </div>
        
        <div className="space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={handleCameraButtonClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full transition-all duration-200 flex items-center space-x-2 font-['Poppins']"
              >
                <span>{showCamera ? 'Parar' : 'Câmera'}</span>
                {showCamera ? '📷' : '📸'}
              </button>
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full transition-all duration-200 cursor-pointer flex items-center space-x-2 font-['Poppins']">
                <span>Enviar</span>
                <span>📁</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {cameraError && (
            <div className="text-red-600 text-center p-4 bg-red-50 rounded-xl border border-red-200">
              {cameraError}
            </div>
          )}

          {showCamera && (
            <div 
              ref={containerRef}
              className="fixed inset-0 bg-black z-50"
            >
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex flex-col items-center space-y-4">
                  <button
                    onClick={capturePhoto}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full transition-all duration-200 flex items-center space-x-2"
                  >
                    <span>Tirar Foto</span>
                    <span>📸</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-red-400 hover:bg-red-500 text-white px-8 py-3 rounded-full transition-all duration-200 flex items-center space-x-2"
                  >
                    <span>Cancelar</span>
                    <span>✖</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {image && !showCamera && (
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-72 h-72 rounded-2xl overflow-hidden">
                <Image
                  src={image}
                  alt="Produto enviado"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                onClick={analyzeImage}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>{loading ? 'Analisando...' : 'Analisar Produto'}</span>
                <span>{loading ? '🔍' : '🌱'}</span>
              </button>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-center p-4 bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                Resultado da Análise 🌱
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 