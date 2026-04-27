param(
  [string]$Sql,
  [string]$SqlFile,
  [string]$MySqlHost = $env:MYSQL_HOST,
  [int]$MySqlPort = $(if ($env:MYSQL_PORT) { [int]$env:MYSQL_PORT } else { 3306 }),
  [string]$MySqlUser = $env:MYSQL_USER,
  [string]$MySqlPassword = $env:MYSQL_PASSWORD,
  [string]$MySqlDatabase = $env:MYSQL_DATABASE,
  [string]$MysqlExe = $(if ($env:MYSQL_EXE) { $env:MYSQL_EXE } else { "mysql.exe" })
)

$ErrorActionPreference = "Stop"

function Import-EnvFile {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }

    $index = $trimmed.IndexOf("=")
    if ($index -lt 1) {
      continue
    }

    $name = $trimmed.Substring(0, $index).Trim()
    $value = $trimmed.Substring($index + 1).Trim()

    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace((Get-Item "Env:$name" -ErrorAction SilentlyContinue).Value)) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

if ([string]::IsNullOrWhiteSpace($env:MYSQL_HOST) -or
    [string]::IsNullOrWhiteSpace($env:MYSQL_USER) -or
    [string]::IsNullOrWhiteSpace($env:MYSQL_DATABASE)) {
  $candidateEnvFiles = @(
    $env:MYSQL_ENV_FILE,
    "C:\Users\hp\.openclaw\workspace\test2\.env",
    "C:\Users\hp\.openclaw\workspace-preparation\.env"
  )

  foreach ($candidate in $candidateEnvFiles) {
    Import-EnvFile -Path $candidate
  }
}

if ([string]::IsNullOrWhiteSpace($MySqlHost)) {
  $MySqlHost = $env:MYSQL_HOST
}

if ($MySqlPort -eq 3306 -and -not [string]::IsNullOrWhiteSpace($env:MYSQL_PORT)) {
  $MySqlPort = [int]$env:MYSQL_PORT
}

if ([string]::IsNullOrWhiteSpace($MySqlUser)) {
  $MySqlUser = $env:MYSQL_USER
}

if ([string]::IsNullOrWhiteSpace($MySqlPassword)) {
  $MySqlPassword = $env:MYSQL_PASSWORD
}

if ([string]::IsNullOrWhiteSpace($MySqlDatabase)) {
  $MySqlDatabase = $env:MYSQL_DATABASE
}

if (-not [string]::IsNullOrWhiteSpace($SqlFile)) {
  if (-not (Test-Path -LiteralPath $SqlFile)) {
    throw "SQL file not found: $SqlFile"
  }
  $Sql = Get-Content -LiteralPath $SqlFile -Raw
}

if ([string]::IsNullOrWhiteSpace($Sql)) {
  throw "SQL is required. Provide -Sql or -SqlFile."
}

if ([string]::IsNullOrWhiteSpace($MySqlHost) -or
    [string]::IsNullOrWhiteSpace($MySqlUser) -or
    [string]::IsNullOrWhiteSpace($MySqlDatabase)) {
  throw "Missing MySQL connection settings. Set MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE or provide MYSQL_ENV_FILE."
}

$tempFile = [System.IO.Path]::GetTempFileName()
try {
  $sqlBody = $Sql.Trim()
  if (-not $sqlBody.EndsWith(";")) {
    $sqlBody = "$sqlBody;"
  }

  $sqlToRun = @"
$sqlBody
SELECT ROW_COUNT() AS affected_rows;
"@

  Set-Content -LiteralPath $tempFile -Value $sqlToRun -Encoding UTF8

  $env:MYSQL_PWD = $MySqlPassword

  $output = Get-Content -LiteralPath $tempFile -Raw | & $MysqlExe --host=$MySqlHost --port=$MySqlPort --user=$MySqlUser --database=$MySqlDatabase --batch --skip-column-names --silent --comments --show-warnings
  if ($LASTEXITCODE -ne 0) {
    throw "mysql.exe exited with code $LASTEXITCODE"
  }

  $lines = @()
  if ($null -ne $output) {
    $lines = @($output | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ -ne "" })
  }

  if ($lines.Count -eq 0) {
    throw "No output was returned by mysql.exe."
  }

  $affectedRowsText = $lines[-1]
  $affectedRows = 0
  if (-not [int]::TryParse($affectedRowsText, [ref]$affectedRows)) {
    throw "Unable to read affected rows from mysql.exe output: $affectedRowsText"
  }

  if ($affectedRows -le 0) {
    throw "The SQL executed but changed 0 rows. Verify the WHERE clause or target data."
  }

  Write-Output "affected_rows=$affectedRows"
}
finally {
  Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
