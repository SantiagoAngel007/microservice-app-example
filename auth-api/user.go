package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
)

var allowedUserHashes = map[string]interface{}{
	"admin_admin": nil,
	"johnd_foo":   nil,
	"janed_ddd":   nil,
}

// Circuit breaker for Users API calls
var usersAPICircuitBreaker = NewCircuitBreaker(
	3,              // max failures
	30*time.Second, // reset timeout
	5*time.Second,  // call timeout
)

type User struct {
	Username  string `json:"username"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Role      string `json:"role"`
}

type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type UserService struct {
	Client            HTTPDoer
	UserAPIAddress    string
	AllowedUserHashes map[string]interface{}
}

func (h *UserService) Login(ctx context.Context, username, password string) (User, error) {
	userKey := fmt.Sprintf("%s_%s", username, password)
	if _, ok := h.AllowedUserHashes[userKey]; !ok {
		return User{}, ErrWrongCredentials
	}

	// Use circuit breaker for external API call
	result, err := usersAPICircuitBreaker.Call(func() (interface{}, error) {
		return h.getUser(ctx, username)
	})

	if err != nil {
		// Fallback: return basic user info when circuit is open
		if err.Error() == "circuit breaker is OPEN" {
			fmt.Printf("Circuit breaker is OPEN, using fallback for user: %s\n", username)
			return h.getFallbackUser(username), nil
		}
		return User{}, err
	}

	return result.(User), nil
}

func (h *UserService) getUser(ctx context.Context, username string) (User, error) {
	var user User

	token, err := h.getUserAPIToken(username)
	if err != nil {
		return user, err
	}

	url := fmt.Sprintf("%s/users/%s", h.UserAPIAddress, username)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("Authorization", "Bearer "+token)
	req = req.WithContext(ctx)

	resp, err := h.Client.Do(req)
	if err != nil {
		return user, fmt.Errorf("failed to call users API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return user, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return user, fmt.Errorf("users API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	err = json.Unmarshal(bodyBytes, &user)
	return user, err
}

// Fallback user data when circuit breaker is open
func (h *UserService) getFallbackUser(username string) User {
	fallbackUsers := map[string]User{
		"admin": {
			Username:  "admin",
			FirstName: "Admin",
			LastName:  "User",
			Role:      "ADMIN",
		},
		"johnd": {
			Username:  "johnd",
			FirstName: "John",
			LastName:  "Doe",
			Role:      "USER",
		},
		"janed": {
			Username:  "janed",
			FirstName: "Jane",
			LastName:  "Doe",
			Role:      "USER",
		},
	}

	if user, exists := fallbackUsers[username]; exists {
		return user
	}

	// Default fallback
	return User{
		Username:  username,
		FirstName: "Unknown",
		LastName:  "User",
		Role:      "USER",
	}
}

func (h *UserService) getUserAPIToken(username string) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = username
	claims["scope"] = "read"
	return token.SignedString([]byte(jwtSecret))
}
