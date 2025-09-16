package ghwebhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"strings"
)

func verifySignature256(sigHeader string, body []byte, secret []byte) bool {
	if len(secret) == 0 || sigHeader == "" {
		return false
	}
	// header form: "sha256=<hex>"
	parts := strings.SplitN(sigHeader, "=", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "sha256") {
		return false
	}
	want := parts[1]

	mac := hmac.New(sha256.New, secret)
	mac.Write(body)
	sum := mac.Sum(nil)
	got := make([]byte, hex.EncodedLen(len(sum)))
	hex.Encode(got, sum)

	// constant-time compare
	if len(want) != len(got) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(strings.ToLower(want)), got) == 1
}
