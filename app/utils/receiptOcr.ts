import Tesseract from 'tesseract.js';

export async function createReceiptOcrWorker(): Promise<Tesseract.Worker> {
  const worker = await Tesseract.createWorker('kor+eng');
  return worker;
}

export async function extractReceiptTotal(
  imageFile: File,
  worker?: Tesseract.Worker
): Promise<number | null> {
  const canvas = await processImageForOCR(imageFile);
  
  if (!canvas) return null;

  try {
    const { data: { text } } = worker 
      ? await worker.recognize(canvas) 
      : await Tesseract.recognize(canvas, 'kor+eng');
      
    return parseReceiptAmount(text);
  } catch (error) {
    console.error('OCR Error:', error);
    return null;
  }
}

async function processImageForOCR(file: File): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);

      // 4.1. Resize: max 1000px
      const MAX_SIZE = 1000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      // 4.2. Crop bottom 30-40% (Let's say bottom 40%)
      const cropRatio = 0.4;
      const cropHeightOrg = Math.floor(img.height * cropRatio);
      const startYOrg = img.height - cropHeightOrg;
      
      const cropHeightCanvas = Math.floor(height * cropRatio);

      canvas.width = width;
      canvas.height = cropHeightCanvas;

      // Draw bottom 40% of the image onto the canvas
      ctx.drawImage(
        img, 
        0, startYOrg, img.width, cropHeightOrg, // Source rect
        0, 0, width, cropHeightCanvas           // Dest rect
      );

      // 4.3. Preprocessing (Grayscale + Threshold 150)
      const imageData = ctx.getImageData(0, 0, width, cropHeightCanvas);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Grayscale
        const avg = (r + g + b) / 3;
        
        // Threshold (150)
        const threshold = avg > 150 ? 255 : 0;
        
        data[i] = threshold;     // r
        data[i + 1] = threshold; // g
        data[i + 2] = threshold; // b
        // data[i + 3] (alpha) remains unchanged
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function parseReceiptAmount(text: string): number | null {
  const lines = text.split('\n');
  const targetLines = lines.filter(line => /(결.?제|합.?계|총.?액)/.test(line));

  if (targetLines.length === 0) {
    return null;
  }

  // 5.3 Number extraction and normalization
  const normalize = (str: string) => {
    return parseInt(
      str
        .replace(/O/gi, '0') // case-insensitive replace for O
        .replace(/[^\d]/g, ''), 
      10
    );
  };

  // 5.4 Extract amount
  const extract = (line: string): number | null => {
    // Regular expression matching segments with numbers, 'O', comma, and period
    const match = line.match(/[\dO.,]+/i);
    return match ? normalize(match[0]) : null;
  };

  const amounts: { line: string; amount: number }[] = [];

  for (const line of targetLines) {
    const amount = extract(line);
    if (amount !== null && !isNaN(amount)) {
      amounts.push({ line, amount });
    }
  }

  if (amounts.length === 0) {
    return null;
  }

  // 6. Final exact logic: Priority Match
  for (const item of amounts) {
    if (/결.?제.?금.?액/.test(item.line)) {
      return item.amount;
    }
  }

  for (const item of amounts) {
    if (/총.?구.?매.?액/.test(item.line)) {
      return item.amount;
    }
  }

  // Fallback: max number
  return Math.max(...amounts.map(item => item.amount));
}
