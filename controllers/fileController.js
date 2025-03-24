const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { File } = require('../models');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const s3 = new S3Client({ region: 'us-east-1' });

// Upload File (POST /v1/file)
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).send();
    }

    try {
        const fileId = uuidv4();
        const fileName = req.file.originalname;
        const s3Key = `${fileId}/${fileName}`;
        
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };

        await s3.send(new PutObjectCommand(params));

        // Store file metadata in database
        const file = await File.create({
            id: fileId,
            filename: fileName,
            s3_path: `${process.env.AWS_BUCKET_NAME}/${s3Key}`,
            size: req.file.size,
            upload_date: new Date()
        });

        // Return response matching Swagger spec exactly
        res.status(201).json({
            file_name: fileName,
            id: fileId,
            url: `${process.env.AWS_BUCKET_NAME}/${s3Key}`,
            upload_date: file.upload_date.toISOString().split('T')[0] // Format as YYYY-MM-DD
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(400).send();
    }
};

// Get File Metadata (GET /v1/file/{id})
const getFileById = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).send();

        // Return response matching Swagger spec exactly
        res.status(200).json({
            file_name: file.filename,
            id: file.id,
            url: file.s3_path,
            upload_date: file.upload_date.toISOString().split('T')[0] // Format as YYYY-MM-DD
        });
    } catch (error) {
        console.error("Error retrieving file:", error);
        res.status(404).send();
    }
};

// Delete File (DELETE /v1/file/{id})
const deleteFile = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).send();

        // Extract the key from s3_path
        const s3Key = file.s3_path.substring(file.s3_path.indexOf('/') + 1);

        // Delete from S3
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key
        }));

        // Delete from database
        await file.destroy();
        
        // Return 204 No Content as per Swagger
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(404).send();
    }
};

module.exports = { uploadFile, getFileById, deleteFile };