import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket
    const bucket = new s3.Bucket(this, 'FileUploadBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000
        }
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      autoDeleteObjects: true
    });

    // Create Lambda function for generating signed URLs
    const getSignedUrlLambda = new lambda.Function(this, 'GetSignedUrlFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getSignedUrl.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
    });

    // Create Lambda function for listing files
    const listFilesLambda = new lambda.Function(this, 'ListFilesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'listFiles.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        BUCKET_NAME: bucket.bucketName
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
    });

    // Grant S3 permissions to Lambda functions
    bucket.grantReadWrite(getSignedUrlLambda);
    bucket.grantRead(listFilesLambda);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'FileUploadApi', {
      restApiName: 'File Upload Service',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'Origin',
          'Accept',
          'Referer',
          'User-Agent'
        ],
        allowCredentials: false,
        maxAge: cdk.Duration.seconds(3600)
      }
    });

    // Add API endpoints with more specific integration settings
    const listFilesIntegration = new apigateway.LambdaIntegration(listFilesLambda, {
      proxy: true,
      allowTestInvoke: false
    });

    const getSignedUrlIntegration = new apigateway.LambdaIntegration(getSignedUrlLambda, {
      proxy: true,
      allowTestInvoke: false
    });

    // Create and configure the listFiles endpoint
    const listFiles = api.root.addResource('listFiles');
    listFiles.addMethod('GET', listFilesIntegration);

    // Create and configure the getSignedUrl endpoint
    const getSignedUrl = api.root.addResource('getSignedUrl');
    getSignedUrl.addMethod('POST', getSignedUrlIntegration);

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
} 