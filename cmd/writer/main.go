package main

import (
	"context"
	"encoding/json"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/google/uuid"
	"log/slog"
	"os"
)

var (
	sqsClient *sqs.Client
	QueueUrl  string
)

type MessageBody struct {
	Message string `json:"message"`
}

func init() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	QueueUrl = os.Getenv("QUEUE_URL")
	slog.Info("queue url", "queue_url", QueueUrl)
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		slog.Error("unable to load sdk config, %v", err)
	}

	sqsClient = sqs.NewFromConfig(cfg)
}

func handleWriterRequest(ctx context.Context, event json.RawMessage) error {
	var message MessageBody
	err := json.Unmarshal(event, &message)
	if err != nil {
		slog.Error("error unmarshalling event: %v", err)
		return err
	}

	messageString, err := json.Marshal(message)
	if err != nil {
		slog.Error("error marshalling message: %v", err)
		return err
	}

	resp, err := sqsClient.SendMessage(ctx, &sqs.SendMessageInput{
		MessageBody:            aws.String(string(messageString)),
		QueueUrl:               aws.String(QueueUrl),
		MessageGroupId:         aws.String(uuid.New().String()),
		MessageDeduplicationId: aws.String(uuid.New().String()),
	})

	if err != nil {
		slog.Error("error sending message: %v", err)
		return err
	}
	slog.Info("message sent: %v", "message_id", resp.MessageId)
	return nil
}

func main() {
	slog.Info("starting writer")
	lambda.Start(handleWriterRequest)
}
