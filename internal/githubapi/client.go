package githubapi

import (
	"context"
	"errors"

	"github.com/AJMerr/hydianflow/internal/database"
	"github.com/google/go-github/v74/github"
	"golang.org/x/oauth2"
)

type Service struct {
	DB *database.DB
}

func (s *Service) clientForUser(ctx context.Context, userID uint) (*github.Client, error) {
	var u database.User
	if err := s.DB.DB.Select("github_access_token").First(&u, userID).Error; err != nil {
		return nil, err
	}
	if u.GitHubAccessToken == nil || *u.GitHubAccessToken == "" {
		return nil, errors.New("missing github token for user")
	}
	src := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: *u.GitHubAccessToken})
	httpClient := oauth2.NewClient(ctx, src)
	return github.NewClient(httpClient), nil
}
