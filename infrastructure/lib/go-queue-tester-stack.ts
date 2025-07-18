import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as kms from "aws-cdk-lib/aws-kms";
import * as go from "@aws-cdk/aws-lambda-go-alpha";
import * as apiGatewayV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {LoggingFormat} from "aws-cdk-lib/aws-lambda";

export class GoQueueTesterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queueKey = new kms.Key(this, 'GoQueueTester-KMS', {
      alias: 'alias/GoQueueTester-KMS',
    })
    const queue = new sqs.Queue(this, 'GoQueueTester-Queue', {
      fifo: true,
      enforceSSL: true,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: queueKey,
    });

    const readerLambda = new go.GoFunction(this, 'GoReaderLambda', {
      entry: "../cmd/reader/main.go",
      functionName: "handleReaderRequest",
      loggingFormat: LoggingFormat.JSON
    });

    const writerLambda = new go.GoFunction(this, 'GoWriterLambda', {
      entry: "../cmd/writer/main.go",
      functionName: "handleWriterRequest",
      environment: {
        QUEUE_URL: queue.queueUrl,
      },
      loggingFormat: LoggingFormat.JSON  
    })

    queue.grantSendMessages(writerLambda);
    queue.grantConsumeMessages(readerLambda);

    readerLambda.addEventSource(new SqsEventSource(queue, {
      batchSize: 10,
    }))

    const api = new apiGatewayV2.HttpApi(this, 'QueueTesterApi', {
      apiName: 'Go Queue Tester Service',
      description: 'This service serves queue testing functionality.',
    });

    const writerIntegration = new integrations.HttpLambdaIntegration('WriterIntegration', writerLambda);

    api.addRoutes({
      path: '/write',
      methods: [apiGatewayV2.HttpMethod.POST],
      integration: writerIntegration
    });

    new cdk.CfnOutput(this, 'ApiUrl', {value: api.apiEndpoint});
  }
}
