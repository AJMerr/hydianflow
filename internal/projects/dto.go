package projects

import "time"

type ProjectCreateRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	ParentID    *uint   `json:"parent_id"`
}

type ProjectResponse struct {
	ID          uint      `json:"id"`
	OwnerID     uint      `json:"owner_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	ParentID    *uint `json:"parent_id"`
	HasChildren *bool `json:"has_children"`
}
