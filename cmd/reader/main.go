package main

import (
	"context"
	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"goQueueTester/models"
	"log/slog"
	"os"
)

func init() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
}

func handleReaderRequest(_ context.Context, event events.SQSEvent) error {
	slog.Info("reading messages from queue")
	slog.Info("received messages", "event", event)

	for _, record := range event.Records {
		var message models.Message
		err := json.Unmarshal([]byte(record.Body), &message)
		if err != nil {
			slog.Error("error unmarshalling message: %v", err)
			return err
		}
		slog.Info("message received", "message", message)
	}
	return nil
}

func main() {
	slog.Info("starting reader")
	lambda.Start(handleReaderRequest)
}
