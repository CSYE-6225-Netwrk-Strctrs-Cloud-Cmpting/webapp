const express = require('express');
const { uploadFile, getFileMetadata, deleteFile, listFiles } = require('../controllers/fileController'); // ✅ Correct Import
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadFile);
router.get('/:file_id', getFileMetadata);
router.delete('/:file_id', deleteFile);
router.get("/", listFiles);

module.exports = router;