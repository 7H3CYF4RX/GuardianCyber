"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tesseract_js_1 = require("tesseract.js");
const pdf_parse_1 = require("pdf-parse");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, async (req, res) => {
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
                const parser = new pdf_parse_1.PDFParse({ data: buffer });
                const result = await parser.getText();
                const extractedStr = typeof result === 'string' ? result : result?.text || '';
                const cleanedText = extractedStr
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                    .trim();
                res.json({ text: cleanedText });
                return;
            }
            catch (pdfErr) {
                console.warn('[PDF Parse Warning]: Fallback to raw text scan', pdfErr?.message);
                const textFallback = buffer.toString('utf8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim();
                res.json({ text: textFallback });
                return;
            }
        }
        // Default image OCR via tesseract.js
        const { data: { text } } = await (0, tesseract_js_1.recognize)(buffer, 'eng');
        const cleanedText = (text || '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            .trim();
        res.json({ text: cleanedText });
    }
    catch (err) {
        console.error('[OCR/Doc Server Error]:', err?.message || err);
        res.status(500).json({ error: 'Failed to process document or image' });
    }
});
exports.default = router;
