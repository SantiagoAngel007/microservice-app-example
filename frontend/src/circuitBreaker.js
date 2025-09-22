class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.callTimeout = options.callTimeout || 5000; // 5 seconds
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  async call(fn) {
    // Check if we should move to HALF_OPEN
    if (this.state === 'OPEN' && Date.now() > this.nextAttempt) {
      this.state = 'HALF_OPEN';
      console.log('Circuit breaker: Moving to HALF_OPEN state');
    }

    // Reject if circuit is OPEN
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  async executeWithTimeout(fn) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Call timeout exceeded'));
      }, this.callTimeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      console.log('Circuit breaker: CLOSED after successful call');
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`Circuit breaker: OPENED after ${this.failureCount} failures`);
    }
  }

  getState() {
    return this.state;
  }
}

export default CircuitBreaker;
