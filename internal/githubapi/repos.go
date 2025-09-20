package githubapi

import (
	"context"
	"strings"

	"github.com/google/go-github/v74/github"
)

func (s *Service) ListUserRepos(ctx context.Context, userID uint, query string, page, perPage int) ([]*github.Repository, *github.Response, error) {
	cli, err := s.clientForUser(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if perPage <= 0 || perPage > 100 {
		perPage = 50
	}
	if page <= 0 {
		page = 1
	}

	opts := &github.RepositoryListByAuthenticatedUserOptions{
		ListOptions: github.ListOptions{Page: page, PerPage: perPage},
		// Shows all repos a user can access
		Visibility:  "all",
		Affiliation: "owner,collaborator,organization_member",
		Sort:        "updated",
		Direction:   "desc",
	}

	repos, resp, err := cli.Repositories.ListByAuthenticatedUser(ctx, opts)
	if err != nil {
		return nil, resp, err
	}

	// Client side search filter
	q := strings.TrimSpace(strings.ToLower(query))
	if q != "" {
		out := make([]*github.Repository, 0, len(repos))
		for _, r := range repos {
			if r == nil {
				continue
			}
			if strings.Contains(strings.ToLower(r.GetFullName()), q) {
				out = append(out, r)
			}
		}
		repos = out
	}

	return repos, resp, nil
}
