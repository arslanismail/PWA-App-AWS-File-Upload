# AWS S3 File Upload PWA

A Progressive Web App (PWA) for uploading and viewing files in AWS S3. Built with React and AWS CDK.

## Features

- 📱 Progressive Web App (PWA) with offline support
- 📤 Drag and drop file upload to S3
- 📥 View uploaded files directly in the browser
- 🔒 Secure file access using signed URLs
- 🎨 Modern UI with Material-UI components
- 🌐 CORS enabled for cross-origin requests
- 📊 File size and type validation
- 🔄 Real-time upload progress tracking

## Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- ngrok (for local development)

## Project Structure

```
.
├── infrastructure/           # AWS CDK infrastructure code
│   ├── lib/                 # CDK stack definitions
│   └── lambda/             # Lambda function code
├── public/                  # Static files for the PWA
├── src/                     # React application code
└── package.json            # Project dependencies
```

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd aws-s3-file-upload-pwa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure AWS credentials:
   ```bash
   aws configure
   ```

4. Deploy the infrastructure:
   ```bash
   cd infrastructure
   cdk deploy
   ```

5. Start the development server:
   ```bash
   npm start
   ```

6. For local development with ngrok:
   ```bash
   ngrok http 3000
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
REACT_APP_API_URL=<your-api-gateway-url>
REACT_APP_BUCKET_NAME=<your-s3-bucket-name>
```

## Development

- The app uses React 18 with TypeScript
- AWS CDK for infrastructure as code
- Material-UI for components
- AWS SDK v3 for S3 operations

## Deployment

1. Build the React app:
   ```bash
   npm run build
   ```

2. Deploy the infrastructure:
   ```bash
   cd infrastructure
   cdk deploy
   ```

## Security Considerations

- All S3 operations use signed URLs
- CORS is configured to allow specific origins
- Lambda functions have minimal IAM permissions
- No sensitive credentials are stored in the frontend

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- AWS CDK team for the infrastructure framework
- Material-UI team for the component library
- React team for the frontend framework 