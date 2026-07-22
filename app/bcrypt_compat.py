"""
bcrypt compatibility module.
Uses the real bcrypt library if available, otherwise falls back to hashlib-based implementation.
This is a development workaround for environments where bcrypt cannot be installed (e.g., MSYS2 Python).
"""

try:
    from bcrypt import gensalt, hashpw, checkpw
except ImportError:
    import hashlib
    import os
    import base64

    def gensalt(rounds=12, prefix=b"2b"):
        """Generate a salt for hashing."""
        salt_bytes = os.urandom(16)
        encoded_salt = base64.b64encode(salt_bytes)[:22]
        return f"${prefix.decode()}${rounds:02d}${encoded_salt.decode()}".encode('utf-8')

    def hashpw(password, salt):
        """Hash a password with the given salt using SHA-256 (fallback)."""
        if isinstance(password, str):
            password = password.encode('utf-8')
        if isinstance(salt, str):
            salt = salt.encode('utf-8')
        
        # Extract the salt string for consistent hashing
        salt_str = salt.decode('utf-8')
        
        # Use PBKDF2 with SHA-256 for reasonable security
        dk = hashlib.pbkdf2_hmac('sha256', password, salt, 100000)
        hashed = base64.b64encode(dk)[:31].decode('utf-8')
        
        return f"{salt_str}{hashed}".encode('utf-8')

    def checkpw(password, hashed_password):
        """Check a password against a hash."""
        if isinstance(password, str):
            password = password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        
        hashed_str = hashed_password.decode('utf-8')
        
        # Extract salt (everything up to and including the 22-char encoded salt)
        # Format: $2b$12$<22-char-salt><31-char-hash>
        parts = hashed_str.split('$')
        if len(parts) >= 4:
            salt_str = f"${parts[1]}${parts[2]}${parts[3][:22]}"
            salt = salt_str.encode('utf-8')
            expected = hashpw(password, salt)
            return expected == hashed_password
        
        return False
