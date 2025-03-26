const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { File } = require('../models');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const StatsD = require('node-statsd');
const statsdClient = new StatsD({ host: 'localhost', port: 8125 });

dotenv.config();

const s3 = new S3Client({ region: 'us-east-1' });

const uploadFile = async (req, res) => {
    if (!req.file) {
        logger.warn('Upload attempted without a file');
        return res.status(400).send();
    }

    const start = Date.now();

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
        statsdClient.timing('s3.upload.time', Date.now() - start);

        const file = await File.create({
            id: fileId,
            filename: fileName,
            s3_path: `${process.env.AWS_BUCKET_NAME}/${s3Key}`,
            size: req.file.size,
            upload_date: new Date()
        });

        logger.info(`File uploaded: ${fileName} (${fileId})`);
        statsdClient.increment('api.upload.count');

        res.status(201).json({
            file_name: fileName,
            id: fileId,
            url: `${process.env.AWS_BUCKET_NAME}/${s3Key}`,
            upload_date: file.upload_date.toISOString().split('T')[0]
        });
    } catch (error) {
        logger.error(`Upload failed: ${error.stack}`);
        res.status(400).send();
    }
};

const getFileById = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).send();

        logger.info(`File metadata fetched: ${file.id}`);
        statsdClient.increment('api.getfile.count');

        res.status(200).json({
            file_name: file.filename,
            id: file.id,
            url: file.s3_path,
            upload_date: file.upload_date.toISOString().split('T')[0]
        });
    } catch (error) {
        logger.error(`Get file failed: ${error.stack}`);
        res.status(404).send();
    }
};

const deleteFile = async (req, res) => {
    try {
        const file = await File.findByPk(req.params.id);
        if (!file) return res.status(404).send();

        const s3Key = file.s3_path.substring(file.s3_path.indexOf('/') + 1);

        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key
        }));

        await file.destroy();

        logger.info(`File deleted: ${file.id}`);
        statsdClient.increment('api.deletefile.count');

        res.status(204).send();
    } catch (error) {
        logger.error(`Delete file failed: ${error.stack}`);
        res.status(404).send();
    }
};

module.exports = { uploadFile, getFileById, deleteFile };
