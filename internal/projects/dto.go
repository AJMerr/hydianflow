package projects

import "time"

type ProjectCreateRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type ProjectResponse struct {
	ID          uint      `json:"id"`
	OwnerID     uint      `json:"owner_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
