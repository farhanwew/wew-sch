package handlers

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
}

type visitor struct {
	count     int
	lastReset time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{
		visitors: make(map[string]*visitor),
	}
}

func (rl *rateLimiter) allow(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[key]
	now := time.Now()

	if !exists || now.Sub(v.lastReset) > window {
		rl.visitors[key] = &visitor{count: 1, lastReset: now}
		return true
	}

	v.count++
	if v.count > limit {
		return false
	}
	return true
}

var (
	authLimiter    = newRateLimiter()
	generalLimiter = newRateLimiter()
)

func AuthRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !authLimiter.allow(ip, 5, time.Minute) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please try again later."})
			c.Abort()
			return
		}
		c.Next()
	}
}

func GeneralRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !generalLimiter.allow(ip, 100, time.Minute) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			c.Abort()
			return
		}
		c.Next()
	}
}
