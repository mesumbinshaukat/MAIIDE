Param(
  [string]$RepoDir = (Join-Path $PSScriptRoot "..\vscode"),
  [string]$NameLong = "Mesum AI IDE",
  [string]$NameShort = "MAIIDE",
  [string]$AppName = "maiide",
  [switch]$InstallDeps = $false,
  [switch]$AttemptBuild = $false
)

Write-Host "[MAIIDE] Target VS Code repo path: $RepoDir" -ForegroundColor Cyan

# 1) Clone VS Code repo if not present
if (!(Test-Path $RepoDir)) {
  Write-Host "[MAIIDE] Cloning microsoft/vscode..." -ForegroundColor Cyan
  git clone https://github.com/microsoft/vscode.git $RepoDir
  if ($LASTEXITCODE -ne 0) { throw "Failed to clone microsoft/vscode" }
} else {
  Write-Host "[MAIIDE] Repo already exists. Skipping clone." -ForegroundColor Yellow
}

# 2) Patch product.json for basic rebrand
$productJsonPath = Join-Path $RepoDir "product.json"
if (!(Test-Path $productJsonPath)) {
  throw "product.json not found at $productJsonPath. The VS Code repo layout may have changed."
}

Write-Host "[MAIIDE] Patching product.json (nameLong, nameShort, applicationName)..." -ForegroundColor Cyan
try {
  $jsonText = Get-Content -LiteralPath $productJsonPath -Raw
  $product = $jsonText | ConvertFrom-Json

  # Keep original values for backup and traceability
  if (-not $product.__maiideBackup) {
    $backup = @{ nameLong = $product.nameLong; nameShort = $product.nameShort; applicationName = $product.applicationName }
    $product | Add-Member -NotePropertyName __maiideBackup -NotePropertyValue $backup -Force
  }

  $product.nameLong = $NameLong
  $product.nameShort = $NameShort
  $product.applicationName = $AppName

  # Write back with stable formatting
  ($product | ConvertTo-Json -Depth 100) | Out-File -LiteralPath $productJsonPath -Encoding UTF8 -Force
  Write-Host "[MAIIDE] product.json updated." -ForegroundColor Green
} catch {
  throw "Failed to patch product.json: $($_.Exception.Message)"
}

# 3) Optional: install dependencies
if ($InstallDeps) {
  Write-Host "[MAIIDE] Installing dependencies (npm ci)... this can take a while" -ForegroundColor Cyan
  Push-Location $RepoDir
  try {
    npm ci
  } finally {
    Pop-Location
  }
}

# 4) Optional: attempt a local build
if ($AttemptBuild) {
  Write-Host "[MAIIDE] Attempting build..." -ForegroundColor Cyan
  Push-Location $RepoDir
  try {
    npm run gulp compile
    npm run gulp vscode-win32-x64-min
    Write-Host "[MAIIDE] Build attempted. Check repository docs for details if errors occur." -ForegroundColor Yellow
  } finally {
    Pop-Location
  }
}

Write-Host "[MAIIDE] Setup complete. You can now open the repo and run VS Code's build tasks.`n - Repo: $RepoDir`n - Branding: $NameLong ($NameShort)" -ForegroundColor Green
