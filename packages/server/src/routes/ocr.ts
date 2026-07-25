import { Router, Request, Response } from 'express';
import { recognize } from 'tesseract.js';
import { PDFParse } from 'pdf-parse';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware as any, async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, isPdf, filename } = req.body;
    if (!image) {
      res.status(400).json({ error: 'File data is required' });
      return;
    }

    // Decode base64 buffer
    const base64Str = image.includes('base64,') ? image.split('base64,')[1] : image;
    const buffer = Buffer.from(base64Str, 'base64');

    // Check if PDF by magic number %PDF or file extension
    const isPdfFile = isPdf || filename?.endsWith('.pdf') || buffer.toString('utf8', 0, 4) === '%PDF';

    if (isPdfFile) {
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const extractedStr = typeof result === 'string' ? result : (result as any)?.text || '';
        const cleanedText = extractedStr
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
          .trim();
        res.json({ text: cleanedText });
        return;
      } catch (pdfErr: any) {
        console.warn('[PDF Parse Warning]: Fallback to raw text scan', pdfErr?.message);
        const textFallback = buffer.toString('utf8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim();
        res.json({ text: textFallback });
        return;
      }
    }

    // Default image OCR via tesseract.js
    const { data: { text } } = await recognize(buffer, 'eng');
    const cleanedText = (text || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .trim();

    res.json({ text: cleanedText });
  } catch (err: any) {
    console.error('[OCR/Doc Server Error]:', err?.message || err);
    res.status(500).json({ error: 'Failed to process document or image' });
  }
});

export default router;
