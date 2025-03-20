const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { File } = require('../models');  // Ensure models are correctly imported
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const s3 = new S3Client({ region: 'us-east-1' });

// ✅ Upload File (Make sure this function exists)
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
    };

    try {
        await s3.send(new PutObjectCommand(params));

        const file = await File.create({
            id: uuidv4(),
            filename: req.file.originalname,
            s3_path: `s3://${process.env.AWS_BUCKET_NAME}/${req.file.originalname}`,
            size: req.file.size
        });

        res.status(201).json({ message: 'File uploaded successfully', file });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ List Files
const listFiles = async (req, res) => {
    try {
        const files = await File.findAll();
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get File Metadata
const getFileMetadata = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.file_id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        res.status(200).json(file);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Delete File
const deleteFile = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.file_id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        const fileName = file.s3_path.split('/').pop();

        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName
        }));

        await file.destroy();
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Ensure all functions are exported
module.exports = { uploadFile, listFiles, getFileMetadata, deleteFile };