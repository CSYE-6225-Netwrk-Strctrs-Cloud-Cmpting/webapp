const express = require('express');
const { uploadFile, getFileById, deleteFile } = require('../controllers/fileController');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /v1/file - Upload a file
router.post("/", upload.single("profilePic"), uploadFile);

// GET /v1/file/{id} - Get file by ID
router.get('/:id', getFileById);

// DELETE /v1/file/{id} - Delete file
router.delete('/:id', deleteFile);

// Return 400 Bad Request for root paths with missing ID
router.get('/', (req, res) => res.status(400).send());
router.delete('/', (req, res) => res.status(400).send());

// Return 405 Method Not Allowed for unsupported methods on root
router.head('/', (req, res) => res.status(405).send());
router.options('/', (req, res) => res.status(405).send());
router.patch('/', (req, res) => res.status(405).send());
router.put('/', (req, res) => res.status(405).send());

// Return 405 Method Not Allowed for unsupported methods with ID
router.head('/:id', (req, res) => res.status(405).send());
router.options('/:id', (req, res) => res.status(405).send());
router.patch('/:id', (req, res) => res.status(405).send());
router.put('/:id', (req, res) => res.status(405).send());
router.post('/:id', (req, res) => res.status(405).send());

module.exports = router;