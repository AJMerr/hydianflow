package database

import (
	"gorm.io/gorm"
	"time"
)

type TaskStatus string

const (
	TaskStatusTodo       TaskStatus = "todo"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
)

type User struct {
	gorm.Model
	GitHubID             int64      `gorm:"column:github_id;uniqueIndex" json:"github_id"`
	GitHubLogin          string     `gorm:"column:github_login;index" json:"github_login"`
	GitHubAccessToken    *string    `gorm:"column:github_access_token" json:"github_access_token"`
	GitHubTokenScope     *string    `gorm:"column:github_token_scope" json:"github_token_scope"`
	GitHubTokenUpdatedAt *time.Time `gorm:"column:github_token_updated_at" json:"github_token_updated_at"`
	Email                *string    `gorm:"uniqueIndex" json:"email"`
	Name                 string     `json:"name"`
	AvatarURL            string     `json:"avatar_url"`

	CreatedTasks  []Task `gorm:"foreignKey:CreatorID" json:"-"`
	AssignedTasks []Task `gorm:"foreignKey:AssigneeID" json:"-"`
}

type Task struct {
	gorm.Model
	Title       string     `gorm:"type:text;not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Tag         *string    `gorm:"column:tag" json:"tag,omitempty"`
	Status      TaskStatus `gorm:"type:varchar(16);not null;default:todo;index" json:"status"`
	Position    float64    `gorm:"not null;default:1000;index" json:"position"`
	CreatorID   uint       `gorm:"index; not null" json:"creator_id"`
	Creator     User       `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"-"`
	AssigneeID  *uint      `gorm:"index" json:"assignee_id"`
	Assignee    *User      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"-"`
	RepoName    *string    `gorm:"column:repo_full_name;index" json:"repo_full_name"`
	BranchHint  *string    `gorm:"column:branch_hint;index" json:"branch_hint"`
	PRNumber    *int       `gorm:"index" json:"pr_number"`
	ProjectID   *uint      `gorm:"index" json:"project_id,omitempty"`
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

type Project struct {
	gorm.Model
	OwnerID     uint   `gorm:"index;not null" json:"owner_id"`
	Owner       User   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"-"`
	Name        string `gorm:"type:text; not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`

	ParentID *uint     `gorm:"index" json:"parent_id,omitempty"`
	Children []Project `gorm:"foreignKey:ParentID" json:"-"`
	Tasks    []Task    `gorm:"foreignKey:ProjectID" json:"-"`
}

type ProjectMember struct {
	ProjectID uint   `gorm:"primaryKey"`
	UserID    uint   `gorm:"primaryKey"`
	Role      string `gorm:"type:varchar(16);not null; default:member"`
}
