import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { GoQueueTesterStack } from '../lib/go-queue-tester-stack';

describe('GoQueueTesterStack', () => {
  let app: cdk.App;
  let stack: GoQueueTesterStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new GoQueueTesterStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('SQS FIFO Queue is created with correct properties', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      FifoQueue: true,
      KmsMasterKeyId: Match.anyValue()
    });
  });

  test('KMS Key is created for queue encryption', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.anyValue()
    });

    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/GoQueueTester-KMS'
    });
  });

  test('Reader Lambda function is created with correct properties', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'handleReaderRequest',
      Runtime: 'provided.al2',
      Handler: 'bootstrap',
      LoggingConfig: {
        LogFormat: 'JSON'
      }
    });
  });

  test('Writer Lambda function is created with correct properties', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'handleWriterRequest',
      Runtime: 'provided.al2',
      Handler: 'bootstrap',
      Environment: {
        Variables: {
          QUEUE_URL: Match.anyValue()
        }
      },
      LoggingConfig: {
        LogFormat: 'JSON'
      }
    });
  });

  test('SQS Event Source is configured for Reader Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      EventSourceArn: Match.anyValue(),
      FunctionName: Match.anyValue(),
      BatchSize: 10
    });
  });

  test('HTTP API Gateway is created', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'Go Queue Tester Service',
      Description: 'This service serves queue testing functionality.',
      ProtocolType: 'HTTP'
    });
  });

  test('API Gateway route is configured for POST /write', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /write'
    });
  });

  test('Lambda integration is created for API Gateway', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
      IntegrationType: 'AWS_PROXY',
      PayloadFormatVersion: '2.0'
    });
  });

  test('IAM policies grant correct permissions', () => {
    // Writer Lambda should have send message permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['sqs:SendMessage'])
          })
        ])
      }
    });

    // Reader Lambda should have receive/delete message permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith([
              'sqs:ReceiveMessage',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes'
            ])
          })
        ])
      }
    });
  });

  test('API URL is exported as output', () => {
    template.hasOutput('ApiUrl', {
      Value: Match.anyValue()
    });
  });

  test('Stack creates exactly the expected number of resources', () => {
    const resources = template.findResources('AWS::Lambda::Function');
    expect(Object.keys(resources)).toHaveLength(2);

    const queues = template.findResources('AWS::SQS::Queue');
    expect(Object.keys(queues)).toHaveLength(1);

    const apis = template.findResources('AWS::ApiGatewayV2::Api');
    expect(Object.keys(apis)).toHaveLength(1);

    const kmsKeys = template.findResources('AWS::KMS::Key');
    expect(Object.keys(kmsKeys)).toHaveLength(1);
  });

  test('Queue enforces SSL', () => {
    template.hasResourceProperties('AWS::SQS::QueuePolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false'
              }
            }
          })
        ])
      }
    });
  });
});
