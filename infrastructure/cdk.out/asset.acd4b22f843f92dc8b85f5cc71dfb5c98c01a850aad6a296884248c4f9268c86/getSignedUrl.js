const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client();

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' })
    };
  }
  
  try {
    console.log('Request body:', event.body);
    const body = JSON.parse(event.body);
    console.log('Parsed body:', body);
    
    const { fileName, fileType } = body;
    
    if (!fileName || !fileType) {
      console.log('Missing required fields:', { fileName, fileType });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileName and fileType are required' })
      };
    }
    
    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: fileName,
      ContentType: fileType,
    });
    
    console.log('Generating signed URL with params:', { fileName, fileType, bucket: process.env.BUCKET_NAME });
    // Generate upload URL that expires in 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('Generated signed URL:', signedUrl);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ signedUrl })
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
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack
      })
    };
  }
}; 