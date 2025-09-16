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
	GitHubID    int64   `gorm:"column:github_id;uniqueIndex" json:"github_id"`
	GitHubLogin string  `gorm:"column:github_login;index" json:"github_login"`
	Email       *string `gorm:"uniqueIndex" json:"email"`
	Name        string  `json:"name"`
	AvatarURL   string  `json:"avatar_url"`

	CreatedTasks  []Task `gorm:"foreignKey:CreatorID" json:"-"`
	AssignedTasks []Task `gorm:"foreignKey:AssigneeID" json:"-"`
}

type Task struct {
	gorm.Model
	Title       string     `gorm:"type:text;not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Status      TaskStatus `gorm:"type:varchar(16);not null;default:todo;index" json:"status"`
	Position    float64    `gorm:"not null;default:1000;index" json:"position"`
	CreatorID   uint       `gorm:"index; not null" json:"creator_id"`
	Creator     User       `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;" json:"-"`
	AssigneeID  *uint      `gorm:"index" json:"assignee_id"`
	Assignee    *User      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"-"`
	RepoName    *string    `gorm:"column:repo_full_name;index" json:"repo_full_name"`
	BranchHint  *string    `gorm:"column:branch_hint;index" json:"branch_hint"`
	PRNumber    *int       `gorm:"index" json:"pr_number"`
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
}
