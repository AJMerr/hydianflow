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
	GitHubID    int64   `gorm:"uniqueIndex" json:"github_id"`
	GitHubLogin string  `gorm:"index" json:"github_login"`
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
	Asignee     *User      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"-"`
	RepoName    *string    `gorm:"index" json:"repo_name"`
	BranchHint  *string    `gorm:"index" json:"branch_hint"`
	PRNumber    *int       `gorm:"index" json:"pr_number"`
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
}
