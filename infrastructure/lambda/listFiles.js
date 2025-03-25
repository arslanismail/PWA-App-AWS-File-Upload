const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client();

// Handle CORS response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin,Accept,Referer,User-Agent',
  'Access-Control-Allow-Methods': 'OPTIONS,GET',
  'Access-Control-Allow-Credentials': 'false'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME
    });

    const response = await s3Client.send(command);
    const files = response.Contents || [];

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(files.map(async (file) => {
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: file.Key,
        ResponseContentDisposition: 'inline'  // This ensures the file opens in the browser
      });

      // Generate a signed URL that expires in 1 hour
      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600
      });

      return {
        name: file.Key,
        lastModified: file.LastModified,
        size: file.Size,
        signedUrl
      };
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ files: filesWithUrls })
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      bucket: process.env.BUCKET_NAME
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message,
        details: error.stack
      })
    };
  }
}; 