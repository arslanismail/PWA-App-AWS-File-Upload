const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client();

// Handle CORS response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin,Accept,Referer,User-Agent',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
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
    // Ensure event.body exists and is a string
    if (!event.body) {
      console.error('No request body provided');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No request body provided' })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', event.body);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    console.log('Parsed body:', body);
    
    const { fileName, fileType } = body;
    
    if (!fileName || !fileType) {
      console.log('Missing required fields:', { fileName, fileType });
      return {
        statusCode: 400,
        headers: corsHeaders,
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
      headers: corsHeaders,
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
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack
      })
    };
  }
}; 