package projects

import "github.com/AJMerr/hydianflow/internal/database"

func toResp(p database.Project, hasChildren bool) ProjectResponse {
	return ProjectResponse{
		ID:          p.ID,
		OwnerID:     p.OwnerID,
		Name:        p.Name,
		Description: nullable(p.Description),
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
		ParentID:    p.ParentID,
		HasChildren: hasChildren,
	}
}

func nullable(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
