package tasks

import (
	"github.com/AJMerr/hydianflow/internal/database"
)

func toResp(t database.Task) TaskResponse {
	return TaskResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: nullableStr(t.Description),
		Tag:         t.Tag,
		Status:      string(t.Status),
		Position:    t.Position,
		CreatorID:   t.CreatorID,
		AssigneeID:  t.AssigneeID,
		StartedAt:   t.StartedAt,
		CompletedAt: t.CompletedAt,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
		RepoName:    t.RepoName,
		BranchHint:  t.BranchHint,
		ProjectID:   t.ProjectID,
	}
}
