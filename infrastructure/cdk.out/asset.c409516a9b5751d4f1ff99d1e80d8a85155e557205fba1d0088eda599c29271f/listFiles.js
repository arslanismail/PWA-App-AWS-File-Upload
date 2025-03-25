const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client();

// Handle CORS response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET',
  'Access-Control-Allow-Credentials': true,
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }
  
  try {
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
        headers: corsHeaders,
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
        // Generate download URL that expires in 1 hour
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
      headers: corsHeaders,
      body: JSON.stringify({ files }),
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
    };
  }
}; 