const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with sanitized, unique filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(cleanOriginalName)}`);
  }
});

// File filter enforcing mimetype validation based on field name
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedPdfTypes = ['application/pdf'];

  if (file.fieldname === 'aadhar_card') {
    // Aadhar card allows Images and PDFs
    if (allowedImageTypes.includes(file.mimetype) || allowedPdfTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Aadhar card must be an image (JPEG, PNG, WEBP) or a PDF file.'), false);
    }
  } else if (
    file.fieldname === 'panel_photos' ||
    file.fieldname === 'inverter_photos' ||
    file.fieldname === 'gps_photos'
  ) {
    // Photo fields allow images only
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`${file.fieldname} must be an image file (JPEG, PNG, WEBP).`), false);
    }
  } else {
    // Unknown field rejected
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
};

// Multer instance with file size limit (10MB per file)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
  }
});

// Fields configuration enforcing exact counts:
// - Aadhar card: 1 file
// - Panel serial num: max 10 photos
// - Inverter serial num: max 2 photos
// - GPS plant photo: max 2 photos
const documentUploadFields = upload.fields([
  { name: 'aadhar_card', maxCount: 1 },
  { name: 'panel_photos', maxCount: 10 },
  { name: 'inverter_photos', maxCount: 2 },
  { name: 'gps_photos', maxCount: 2 }
]);

// Wrapper middleware for clean, custom Multer error handling
const handleUploadMiddleware = (req, res, next) => {
  documentUploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: `Field limit exceeded or unexpected field name: '${err.field}'. Check maximum file counts: Aadhar (1), Panel (10), Inverter (2), GPS (2).`
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size limit exceeded. Maximum file size is 10MB.'
        });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = {
  handleUploadMiddleware,
  uploadDir
};
