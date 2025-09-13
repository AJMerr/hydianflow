package database

import (
	"gorm.io/gorm"
)

func SeedDevUser(db *gorm.DB) (uint, error) {
	u := User{
		GitHubID:    123341234123,
		GitHubLogin: "devuser",
		Name:        "dev user",
		AvatarURL:   "",
	}

	if err := db.Where("github_id = ?", u.GitHubID).FirstOrCreate(&u).Error; err != nil {
		return 0, err
	}
	return u.ID, nil
}
