// routes/materials.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const COURSE_PDF_BASE = process.env.COURSE_PDF_BASE || path.join(__dirname, '..', 'secure_pdfs');

// === authMiddleware ===
// Replace this with your app's actual auth middleware. This example expects req.user to be set.
function authMiddleware(req, res, next) {
  if (req.user && req.user.email) return next();
  // If you use JWT/cookie, verify token here and set req.user
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

/**
 * List PDFs for a course (only if user purchased it)
 * GET /materials/:courseId
 */
router.get('/:courseId', authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const user = req.user;

    // Check purchase: adapt to your schema (you said purchasedCourses is array of course names)
    if (!Array.isArray(user.purchasedCourses) || !user.purchasedCourses.includes(courseId)) {
      return res.status(403).json({ success: false, message: 'Not purchased' });
    }

    const courseDir = path.join(COURSE_PDF_BASE, courseId);
    if (!fs.existsSync(courseDir)) return res.json({ success: true, materials: [] });

    const files = fs.readdirSync(courseDir)
      .filter(f => /\.pdf$/i.test(f))
      .map(f => ({ name: f.replace(/\.pdf$/i, ''), pdfUrl: `/secure-pdf/${encodeURIComponent(courseId)}/${encodeURIComponent(f)}` }));

    return res.json({ success: true, materials: files });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Serve a single PDF inline (view-only)
 * GET /secure-pdf/:courseId/:filename
 */
router.get('/secure-pdf/:courseId/:filename', authMiddleware, (req, res) => {
  try {
    const { courseId, filename } = req.params;
    const user = req.user;

    if (!Array.isArray(user.purchasedCourses) || !user.purchasedCourses.includes(courseId)) {
      return res.status(403).send('Access denied');
    }

    const filePath = path.join(COURSE_PDF_BASE, courseId, filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filename)}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
