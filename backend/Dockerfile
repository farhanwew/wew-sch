# Build stage
FROM golang:1.25.5-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary (no CGO needed for PostgreSQL)
RUN CGO_ENABLED=0 GOOS=linux go build -a -o server .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .

# Expose port
EXPOSE 8000

# Run as non-root user
USER appuser

CMD ["./server"]
