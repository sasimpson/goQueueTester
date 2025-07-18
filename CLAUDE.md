# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Go-based AWS queue testing application that demonstrates SQS FIFO queue functionality using AWS Lambda functions and AWS CDK for infrastructure. The system consists of:

- **Writer Lambda**: HTTP API endpoint that receives JSON messages and sends them to an SQS FIFO queue
- **Reader Lambda**: SQS event-triggered function that processes messages from the queue
- **Infrastructure**: AWS CDK TypeScript stack that provisions the AWS resources

## Architecture

### Core Components

- `cmd/writer/main.go`: Lambda function that receives HTTP requests and writes messages to SQS
- `cmd/reader/main.go`: Lambda function triggered by SQS events to process messages
- `models/message.go`: Shared message structure used across both Lambda functions
- `infrastructure/`: CDK TypeScript project for AWS resource provisioning

### AWS Resources Created

- SQS FIFO Queue with KMS encryption
- Two Lambda functions (Go runtime)
- HTTP API Gateway with POST /write endpoint
- IAM roles and permissions for queue access
- KMS key for queue encryption

## Development Commands

### Go Application

```bash
# Build both Lambda functions
go build ./cmd/writer
go build ./cmd/reader

# Test the Go code
go test ./...

# Run tests with verbose output
go test -v ./...

# Check dependencies
go mod tidy
go mod verify
```

### Infrastructure (CDK)

```bash
# Navigate to infrastructure directory first
cd infrastructure

# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch for changes
npm run watch

# Run tests
npm run test

# Deploy to AWS
npx cdk deploy

# View differences with deployed stack
npx cdk diff

# Generate CloudFormation template
npx cdk synth
```

### Environment Variables

The writer Lambda function requires:
- `QUEUE_URL`: Set automatically by CDK deployment

## Key Implementation Details

- Both Lambda functions use structured JSON logging with `slog`
- Writer Lambda expects JSON message body with `{"body": "message content"}` format
- Reader Lambda processes SQS events in batches of up to 10 messages
- Queue uses FIFO ordering with message deduplication
- All AWS resources use encryption and enforce SSL

## Testing the Application

1. Deploy infrastructure: `cd infrastructure && npx cdk deploy`
2. Use the API endpoint output to send POST requests to `/write` with JSON payload
3. Monitor CloudWatch logs to see message processing in reader Lambda

## File Structure

```
├── cmd/
│   ├── reader/main.go    # SQS message consumer Lambda
│   └── writer/main.go    # HTTP API message producer Lambda
├── models/
│   └── message.go        # Shared message structure
├── infrastructure/       # AWS CDK TypeScript project
│   ├── lib/go-queue-tester-stack.ts  # Main CDK stack definition
│   └── package.json      # CDK dependencies and scripts
├── go.mod               # Go module definition
└── go.sum               # Go dependency checksums
```