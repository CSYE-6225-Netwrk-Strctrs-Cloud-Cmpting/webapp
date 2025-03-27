const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { File } = require('../models');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const StatsD = require('hot-shots');

dotenv.config();

const s3 = new S3Client({ region: 'us-east-1' });
const statsd = new StatsD({ host: '127.0.0.1', port: 8125 });

// Upload File (POST /v1/file)
const uploadFile = async (req, res) => {
    if (!req.file) {
        logger.warn("No file uploaded");
        return res.status(400).send();
    }

    const startTime = Date.now();

    try {
        const fileId = uuidv4();
        const fileName = req.file.originalname;
        const s3Key = `${fileId}/${fileName}`;

        const s3Start = Date.now();
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };

        await s3.send(new PutObjectCommand(params));
        statsd.timing("s3.upload_time", Date.now() - s3Start);

        const dbStart = Date.now();
        const file = await File.create({
            id: fileId,
            filename: fileName,
            s3_path: `${process.env.AWS_BUCKET_NAME}/${s3Key}`,
            size: req.file.size,
            upload_date: new Date()
        });
        statsd.timing("db.insert_time", Date.now() - dbStart);

        statsd.increment("api.upload.count");
        statsd.timing("api.upload.total_time", Date.now() - startTime);

        logger.info(`File uploaded: ${fileName}`);

        res.status(201).json({
            file_name: fileName,
            id: fileId,
            url: `${process.env.AWS_BUCKET_NAME}/${s3Key}`,
            upload_date: file.upload_date.toISOString().split('T')[0]
        });
    } catch (error) {
        logger.error(`Error uploading file: ${error.stack}`);
        res.status(400).send();
    }
};

// Get File Metadata (GET /v1/file/{id})
const getFileById = async (req, res) => {
    const startTime = Date.now();

    try {
        const file = await File.findByPk(req.params.id);
        if (!file) {
            logger.warn(`File not found: ${req.params.id}`);
            return res.status(404).send();
        }

        statsd.increment("api.get_file.count");
        statsd.timing("api.get_file.total_time", Date.now() - startTime);

        res.status(200).json({
            file_name: file.filename,
            id: file.id,
            url: file.s3_path,
            upload_date: file.upload_date.toISOString().split('T')[0]
        });
    } catch (error) {
        logger.error(`Error retrieving file: ${error.stack}`);
        res.status(404).send();
    }
};

// Delete File (DELETE /v1/file/{id})
const deleteFile = async (req, res) => {
    const startTime = Date.now();

    try {
        const file = await File.findByPk(req.params.id);
        if (!file) {
            logger.warn(`File to delete not found: ${req.params.id}`);
            return res.status(404).send();
        }

        const s3Key = file.s3_path.substring(file.s3_path.indexOf('/') + 1);

        const s3Start = Date.now();
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key
        }));
        statsd.timing("s3.delete_time", Date.now() - s3Start);

        const dbStart = Date.now();
        await file.destroy();
        statsd.timing("db.delete_time", Date.now() - dbStart);

        statsd.increment("api.delete.count");
        statsd.timing("api.delete.total_time", Date.now() - startTime);

        logger.info(`File deleted: ${file.id}`);
        res.status(204).send();
    } catch (error) {
        logger.error(`Error deleting file: ${error.stack}`);
        res.status(404).send();
    }
};

module.exports = { uploadFile, getFileById, deleteFile };