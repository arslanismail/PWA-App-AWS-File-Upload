const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Handle CORS response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Allow all origins
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
  'Access-Control-Allow-Credentials': 'false',  // Must be false when using '*'
  'Content-Type': 'application/json'
};

// Function to get CORS headers with dynamic origin
const getCorsHeaders = (event) => {
  return {
    ...corsHeaders,
    // If there's an origin header, use it, otherwise use '*'
    'Access-Control-Allow-Origin': event.headers?.origin || '*'
  };
};

const getSignedUrl = async (s3Client, command, options = {}) => {
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: options.expiresIn || 3600,
    // Add Content-Disposition header for inline viewing
    responseHeaders: {
      'Content-Disposition': 'inline',
      'Content-Type': command.input.Key.endsWith('.pdf') ? 'application/pdf' : 
                     command.input.Key.endsWith('.jpg') || command.input.Key.endsWith('.jpeg') ? 'image/jpeg' :
                     command.input.Key.endsWith('.png') ? 'image/png' : 'application/octet-stream'
    }
  });
  return signedUrl;
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  console.log('Environment:', process.env);
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }
  
  try {
    if (!process.env.BUCKET_NAME) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }

    console.log('Listing files from bucket:', process.env.BUCKET_NAME);
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
    });
    
    const data = await s3Client.send(listCommand);
    console.log('List objects response:', JSON.stringify(data));
    
    // Check if Contents exists and is an array
    if (!data.Contents || !Array.isArray(data.Contents)) {
      console.log('No files found in bucket');
      return {
        statusCode: 200,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ files: [] }),
      };
    }
    
    const files = await Promise.all(
      data.Contents.map(async (item) => {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: item.Key,
        });
        
        console.log('Generating signed URL for:', item.Key);
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
        return {
          name: item.Key,
          url: signedUrl,
          size: item.Size,
          lastModified: item.LastModified,
        };
      })
    );
    
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ files }),
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
      headers: getCorsHeaders(event),
      body: JSON.stringify({ 
        error: error.message,
        type: error.name,
        code: error.code
      }),
    };
  }
}; 