package tasks

import "time"

type TaskCreateRequest struct {
	Title       string   `json:"title"`
	Description *string  `json:"description,omitempty"`
	Status      *string  `json:"status,omitempty"`
	Position    *float64 `json:"position,omitempty"`
	RepoName    *string  `json:"repo_full_name,omitempty"`
	BranchHint  *string  `json:"branch_hint,omitempty"`
	ProjectID   *uint    `json:"project_id,omitempty"`
	AssigneeID  *uint    `json:"assignee_id,omitempty"`
}

type TaskUpdateRequest struct {
	Title       *string  `json:"title,omitempty"`
	Description *string  `json:"description,omitempty"`
	Status      *string  `json:"status,omitempty"`
	AssigneeID  *uint    `json:"assignee_id,omitempty"`
	Position    *float64 `json:"position,omitempty"`
	RepoName    *string  `json:"repo_full_name,omitempty"`
	BranchHint  *string  `json:"branch_hint,omitempty"`
	ProjectID   *uint    `json:"project_id,omitempty"`
}

type TaskResponse struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Status      string     `json:"status"`
	Position    float64    `json:"position"`
	CreatorID   uint       `json:"creator_id"`
	AssigneeID  *uint      `json:"assignee_id,omitempty"`
	RepoName    *string    `json:"repo_full_name,omitempty"`
	BranchHint  *string    `json:"branch_hint,omitempty"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
