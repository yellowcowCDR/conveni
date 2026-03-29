'use client';

import { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { extractReceiptTotal, createReceiptOcrWorker } from '@/app/utils/receiptOcr';

interface FileResult {
  id: string;
  file: File;
  previewUrl: string;
  amount: number | null;
  rawText: string | null;
  timeTaken: number | null;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export default function OcrTestPage() {
  const [worker, setWorker] = useState<Tesseract.Worker | null>(null);
  const [workerStatus, setWorkerStatus] = useState<string>('워커 초기화 중...');
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 카메라 기능 관련 상태
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 컴포넌트 마운트 시 워커 초기화
  useEffect(() => {
    let activeWorker: Tesseract.Worker | null = null;
    
    const initWorker = async () => {
      try {
        const w = await createReceiptOcrWorker();
        activeWorker = w;
        setWorker(w);
        setWorkerStatus('워커 초기화 완료.');
      } catch (error) {
        console.error(error);
        setWorkerStatus('워커 초기화 실패');
      }
    };

    initWorker();

    return () => {
      if (activeWorker) {
        activeWorker.terminate();
      }
      // 미리보기 URL 정리
      fileResults.forEach(r => URL.revokeObjectURL(r.previewUrl));
      // 카메라 스트림 정리
      closeCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processOCR = async (file: File, id: string) => {
    setIsProcessing(true);
    
    // 이 파일 항목만 processing으로 변경
    setFileResults(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'processing' } : r
    ));

    const startTime = performance.now();
    try {
      // @ts-ignore (worker null check is done outside)
      const result = await extractReceiptTotal(file, worker);
      const endTime = performance.now();
      
      const amount = result?.amount ?? null;
      const rawText = result?.rawText ?? null;

      setFileResults(prev => prev.map(r => 
        r.id === id ? { 
          ...r, 
          status: result !== null ? 'done' : 'error',
          amount,
          rawText,
          timeTaken: Math.round(endTime - startTime)
        } : r
      ));
    } catch (error) {
      console.error(error);
      setFileResults(prev => prev.map(r => 
        r.id === id ? { ...r, status: 'error' } : r
      ));
    }
    
    setIsProcessing(false);
  };

  // 일반 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    if (!worker) {
      alert('워커가 아직 초기화되지 않았습니다.');
      return;
    }

    const files = Array.from(e.target.files);
    
    const newResults: FileResult[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      amount: null,
      rawText: null,
      timeTaken: null,
      status: 'pending'
    }));

    setFileResults(prev => [...prev, ...newResults]);
    
    for (const item of newResults) {
      await processOCR(item.file, item.id);
    }
    
    e.target.value = '';
  };

  // 웹 카메라 열기
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // 가급적 후면 카메라 사용
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error('Failed to access camera', err);
      alert('카메라 접근 불가 (보안 정책 또는 기기에 카메라가 없을 수 있습니다.)');
    }
  };

  // 웹 카메라 닫기
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // 카메라 프레임 촬영 후 OCR 대기열에 추가
  const capturePhoto = () => {
    if (!worker) {
      alert('워커가 아직 초기화되지 않았습니다.');
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const newItem: FileResult = {
        id: `capture-${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        amount: null,
        rawText: null,
        timeTaken: null,
        status: 'pending'
      };

      setFileResults(prev => [...prev, newItem]);
      
      // 촬영 직후 비동기로 OCR 분석 시작
      setTimeout(() => processOCR(file, newItem.id), 50);
    }, 'image/jpeg', 0.95);
  };

  const removeFile = (id: string) => {
    setFileResults(prev => {
      const target = prev.find(r => r.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(r => r.id !== id);
    });
  };

  const totalSum = fileResults.reduce((sum, item) => sum + (item.amount || 0), 0);
  const successCount = fileResults.filter(r => r.amount !== null).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>영수증 다중 카메라 OCR 테스트</h1>
      
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ margin: 0, fontWeight: '500', color: worker ? '#059669' : '#d97706' }}>
          상태: {workerStatus}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {/* 기존 파일 업로드 방식 */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', padding: '12px', backgroundColor: '#e5e7eb', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            사진/파일 선택하기
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileUpload}
              disabled={!worker || isCameraOpen}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* 웹 카메라 방식 */}
        {!isCameraOpen ? (
          <button 
            onClick={openCamera}
            style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            웹에서 카메라 켜기
          </button>
        ) : (
          <button 
            onClick={closeCamera}
            style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            카메라 끄기
          </button>
        )}
      </div>

      {isCameraOpen && (
        <div style={{ marginBottom: '32px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
          />
          <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={capturePhoto}
              style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff', border: '4px solid #d1d5db', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
              title="촬영하기"
            />
          </div>
        </div>
      )}

      {isProcessing && <p style={{ color: '#2563eb', fontWeight: 'bold', marginBottom: '16px' }}>OCR 처리 중입니다. 여러 줄로 나뉘어 있는 영수증 총합을 분석중입니다...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {fileResults.map((item) => (
          <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button 
              onClick={() => removeFile(item.id)}
              disabled={item.status === 'processing'}
              style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', zIndex: 10 }}
            >
              &times;
            </button>
            
            <img 
              src={item.previewUrl} 
              alt="Receipt" 
              style={{ width: '100%', height: '150px', objectFit: 'contain', backgroundColor: '#f9fafb', marginBottom: '12px', borderRadius: '4px' }}
            />
            
            <div style={{ marginTop: 'auto', textAlign: 'center' }}>
              {item.status === 'pending' && <span style={{ color: '#6b7280' }}>대기 중...</span>}
              {item.status === 'processing' && <span style={{ color: '#2563eb', fontWeight: 'bold' }}>인식 중...</span>}
              {item.status === 'error' && <span style={{ color: '#ef4444' }}>인식 실패</span>}
              {item.status === 'done' && (
                <>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                    {item.amount !== null ? `${item.amount.toLocaleString()}원` : '결과 없음'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: '8px' }}>
                    {item.timeTaken}ms 소요
                  </div>
                  {item.rawText && (
                    <div style={{ textAlign: 'left', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto', fontSize: '11px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                      <strong>인식 원문:</strong><br />
                      {item.rawText}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {fileResults.length > 0 && (
        <div style={{ padding: '24px', border: '2px solid #2563eb', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e3a8a' }}>
              총 합계 금액
            </h2>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: '14px' }}>
              성공: {successCount}건 / 전체: {fileResults.length}건
            </p>
          </div>
          
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1d4ed8' }}>
            {totalSum.toLocaleString()}원
          </div>
        </div>
      )}
    </div>
  );
}
