/**
 * auth_tokens
 * Handles short-lived, single-use security tokens for sensitive actions.
 * Stored as SHA-256 hashes to guarantee data-at-rest protection.
 */
CREATE TABLE auth_tokens (
                             id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                             user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             token_hash  VARCHAR(64)  NOT NULL UNIQUE, -- SHA-256 hash of the hex token
                             type        VARCHAR(30)  NOT NULL,        -- EMAIL_VERIFICATION | PASSWORD_RESET
                             expires_at  TIMESTAMPTZ  NOT NULL,
                             created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


COMMENT ON TABLE auth_tokens IS 'Secure token storage for registration verifications and password resets.';