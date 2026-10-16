# Repairs only the local PostgreSQL settings in the repository-root .env.
# The password is entered interactively and is never written into this script.
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$examplePath = Join-Path $repoRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $examplePath)) {
        throw "Cannot find .env.example at $examplePath"
    }
    Copy-Item $examplePath $envPath
}

$securePassword = Read-Host "Enter the PostgreSQL password for role bunk24_app" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

if ([string]::IsNullOrWhiteSpace($password)) {
    throw "Password cannot be empty. No settings were changed."
}

# URL-encode the password only in DATABASE_URL. POSTGRES_PASSWORD stores the
# actual password value for optional Compose use.
$encodedPassword = [Uri]::EscapeDataString($password)
$updates = [ordered]@{
    "POSTGRES_DB" = "bunk24_app"
    "POSTGRES_USER" = "bunk24_app"
    "POSTGRES_PASSWORD" = $password
    "DATABASE_URL" = "postgresql+psycopg://bunk24_app:$encodedPassword@127.0.0.1:5432/bunk24_app"
}

$lines = @(Get-Content -LiteralPath $envPath)
foreach ($key in $updates.Keys) {
    $pattern = "^" + [regex]::Escape($key) + "\s*="
    $replacement = "$key=$($updates[$key])"
    $found = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $pattern) {
            $lines[$i] = $replacement
            $found = $true
        }
    }

    if (-not $found) {
        $lines += $replacement
    }
}

Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
Write-Host "Updated .env for local PostgreSQL at 127.0.0.1:5432, database bunk24_app."
Write-Host "The password was not displayed. Restart the backend after running this script."
