package ghwebhook

import (
	"strings"
)

func branchPrefix(b string) []string {
	b = strings.Trim(b, "/")
	if b == "" {
		return nil
	}
	parts := strings.Split(b, "/")
	prefixes := make([]string, 0, len(parts))
	cur := parts[0]
	prefixes = append(prefixes, cur)
	for i := 1; i < len(parts); i++ {
		cur = cur + "/" + parts[i]
		prefixes = append(prefixes, cur)
	}
	return prefixes
}
