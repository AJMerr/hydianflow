package githubapi

import (
	"context"
	"strings"

	"github.com/google/go-github/v74/github"
)

func (s *Service) ListBranches(ctx context.Context, userID uint, ownerRepo string, page, perPage int) ([]*github.Branch, *github.Response, error) {
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

	owner, repo := splitOwnerRepo(ownerRepo)
	opts := &github.BranchListOptions{ListOptions: github.ListOptions{Page: page, PerPage: perPage}}
	return cli.Repositories.ListBranches(ctx, owner, repo, opts)
}

func splitOwnerRepo(full string) (owner, repo string) {
	parts := strings.SplitN(full, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", full
}
