const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client with explicit region
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1'
});

// Get CORS headers with dynamic origin
const getCorsHeaders = (event) => {
  return {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };
};

const generateSignedUrlWithHeaders = async (s3Client, command, options = {}) => {
  if (!command.input?.Key) {
    throw new Error('File key is required for generating signed URL');
  }

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
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Environment:', {
    BUCKET_NAME: process.env.BUCKET_NAME,
    AWS_REGION: process.env.AWS_REGION
  });

  const headers = getCorsHeaders(event);
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }
  
  try {
    // Validate environment variables
    if (!process.env.BUCKET_NAME) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }

    console.log('Listing files from bucket:', process.env.BUCKET_NAME);
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
    });
    
    const data = await s3Client.send(listCommand);
    console.log('List objects response:', JSON.stringify(data, null, 2));
    
    // Check if Contents exists and is an array
    if (!data.Contents || !Array.isArray(data.Contents)) {
      console.log('No files found in bucket');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ files: [] })
      };
    }
    
    const files = await Promise.all(
      data.Contents.map(async (item) => {
        if (!item.Key) {
          console.error('Invalid item in bucket listing:', item);
          return null;
        }

        const getCommand = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: item.Key,
        });
        
        console.log('Generating signed URL for:', item.Key);
        try {
          const signedUrl = await generateSignedUrlWithHeaders(s3Client, getCommand, { expiresIn: 3600 });
          return {
            name: item.Key,
            url: signedUrl,
            size: item.Size,
            lastModified: item.LastModified,
          };
        } catch (urlError) {
          console.error('Error generating signed URL for', item.Key, ':', urlError);
          return {
            name: item.Key,
            error: 'Failed to generate URL',
            size: item.Size,
            lastModified: item.LastModified,
          };
        }
      })
    ).then(files => files.filter(Boolean)); // Remove any null entries
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ files })
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      bucket: process.env.BUCKET_NAME,
      region: process.env.AWS_REGION
    });
    
    return {
      statusCode: error.code === 'NoSuchBucket' ? 404 : 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        type: error.name,
        code: error.code
      })
    };
  }
}; 