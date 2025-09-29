package main

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

// CircuitState represents the state of the circuit breaker
type CircuitState int

const (
	Closed CircuitState = iota
	Open
	HalfOpen
)

// CircuitBreaker implements the Circuit Breaker pattern
type CircuitBreaker struct {
	maxFailures     int
	resetTimeout    time.Duration
	callTimeout     time.Duration
	mutex           sync.RWMutex
	state           CircuitState
	failures        int
	lastFailureTime time.Time
	nextAttempt     time.Time
}

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(maxFailures int, resetTimeout, callTimeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		maxFailures:  maxFailures,
		resetTimeout: resetTimeout,
		callTimeout:  callTimeout,
		state:        Closed,
	}
}

// Call executes the function with circuit breaker protection
func (cb *CircuitBreaker) Call(fn func() (interface{}, error)) (interface{}, error) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	// Check if circuit breaker should trip to half-open
	if cb.state == Open && time.Now().After(cb.nextAttempt) {
		cb.state = HalfOpen
		fmt.Printf("Circuit breaker moving to HALF_OPEN state\n")
	}

	// Reject calls when circuit is open
	if cb.state == Open {
		return nil, errors.New("circuit breaker is OPEN")
	}

	// Execute the function call
	result, err := cb.executeWithTimeout(fn)
	if err != nil {
		cb.onFailure()
		return nil, err
	}

	cb.onSuccess()
	return result, nil
}

func (cb *CircuitBreaker) executeWithTimeout(fn func() (interface{}, error)) (interface{}, error) {
	resultChan := make(chan interface{}, 1)
	errorChan := make(chan error, 1)

	go func() {
		result, err := fn()
		if err != nil {
			errorChan <- err
		} else {
			resultChan <- result
		}
	}()

	select {
	case result := <-resultChan:
		return result, nil
	case err := <-errorChan:
		return nil, err
	case <-time.After(cb.callTimeout):
		return nil, errors.New("call timeout exceeded")
	}
}

func (cb *CircuitBreaker) onSuccess() {
	if cb.state == HalfOpen {
		cb.state = Closed
		cb.failures = 0
		fmt.Printf("Circuit breaker CLOSED after successful call\n")
	}
}

func (cb *CircuitBreaker) onFailure() {
	cb.failures++
	cb.lastFailureTime = time.Now()

	if cb.state == HalfOpen || cb.failures >= cb.maxFailures {
		cb.state = Open
		cb.nextAttempt = time.Now().Add(cb.resetTimeout)
		fmt.Printf("Circuit breaker OPENED after %d failures\n", cb.failures)
	}
}

// GetState returns the current state of the circuit breaker
func (cb *CircuitBreaker) GetState() CircuitState {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()
	return cb.state
}