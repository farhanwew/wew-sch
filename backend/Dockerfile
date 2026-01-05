# Build stage
FROM golang:1.25.5-alpine AS builder

WORKDIR /app

# Install build dependencies for CGO (needed for SQLite)
RUN apk add --no-cache gcc musl-dev

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary with CGO enabled for SQLite
RUN CGO_ENABLED=1 GOOS=linux go build -a -o server .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy binary from builder
COPY --from=builder /app/server .

# Expose port
EXPOSE 8000

# Volume for SQLite data persistence
VOLUME ["/app/data"]

# Run
CMD ["./server"]
