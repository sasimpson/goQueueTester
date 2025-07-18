package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/google/uuid"
	"goQueueTester/models"
	"log/slog"
	"net/http"
	"os"
)

var (
	sqsClient *sqs.Client
	QueueUrl  string
)

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

func handleWriterRequest(ctx context.Context, request events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if QueueUrl == "" {
		slog.Error("queue url not set")
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "queue url not set",
		}, errors.New("queue url not set")
	}

	var message models.Message
	err := json.Unmarshal([]byte(request.Body), &message)
	if err != nil {
		slog.Error("error unmarshalling message: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "error unmarshalling message",
			Headers: map[string]string{
				"x-app-lang": "go v1.24.4",
			},
		}, err
	}
	slog.Info("message received", "message", message)

	event, err := json.Marshal(message)
	if err != nil {
		slog.Error("error marshalling message: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "error marshalling message",
			Headers: map[string]string{
				"x-app-lang": "go v1.24.4",
			},
		}, err
	}

	resp, err := sqsClient.SendMessage(ctx, &sqs.SendMessageInput{
		MessageBody:            aws.String(string(event)),
		QueueUrl:               aws.String(QueueUrl),
		MessageGroupId:         aws.String(uuid.New().String()),
		MessageDeduplicationId: aws.String(uuid.New().String()),
	})

	if err != nil {
		slog.Error("error sending message: %v", err)
		return events.APIGatewayV2HTTPResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "error sending message",
			Headers: map[string]string{
				"x-app-lang": "go v1.24.4",
			},
		}, err
	}
	slog.Info("message sent: %v", "message_id", resp.MessageId)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       fmt.Sprintf("message sent: %s", *resp.MessageId),
		Headers: map[string]string{
			"x-app-lang": "go v1.24.4",
		},
	}, nil
}

func main() {
	slog.Info("starting writer")
	lambda.Start(handleWriterRequest)
}
