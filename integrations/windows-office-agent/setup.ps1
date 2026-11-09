param(
    [string]$WorkspaceRoot = (Join-Path $env:USERPROFILE "Documents\OpenMausBot-Agent")
)
$ErrorActionPreference = "Stop"
$AgentDir = $PSScriptRoot
$VenvPython = Join-Path $AgentDir ".venv\Scripts\python.exe"

function Find-Python {
    $candidates = @(
        @{ Command = "py"; Args = @("-3.11", "--version") },
        @{ Command = "python"; Args = @("--version") },
        @{ Command = "python3"; Args = @("--version") }
    )
    foreach ($item in $candidates) {
        $cmd = Get-Command $item.Command -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        try {
            $versionText = & $item.Command @($item.Args) 2>&1 | Out-String
            if ($LASTEXITCODE -eq 0 -and $versionText -match "Python\s+(\d+)\.(\d+)") {
                $major = [int]$Matches[1]; $minor = [int]$Matches[2]
                if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 11)) {
                    return @{ Command=$item.Command; Args=($item.Args[0..($item.Args.Length - 2)]) }
                }
            }
        } catch { }
    }
    throw "Can cai Python 3.11 tro len. Cai tu https://www.python.org/downloads/windows/ roi chay lai setup.ps1."
}

$Python = Find-Python
if (-not (Test-Path $VenvPython)) {
    $VenvArgs = @($Python.Args) + @("-m", "venv", (Join-Path $AgentDir ".venv"))
    & $Python.Command @VenvArgs
    if ($LASTEXITCODE -ne 0) { throw "Khong tao duoc moi truong Python." }
}
& $VenvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "Khong cap nhat duoc pip." }
& $VenvPython -m pip install -r (Join-Path $AgentDir "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Khong cai duoc cac thu vien Office Agent." }
New-Item -ItemType Directory -Force -Path $WorkspaceRoot | Out-Null
Write-Host "Da cai Windows Office Agent."
Write-Host "Thu muc mac dinh: $WorkspaceRoot"
Write-Host "Python MCP: $VenvPython"
Write-Host "Server: $(Join-Path $AgentDir 'server.py')"
Write-Host "Trong OpenMausBot: Plugins > MCP servers > Add server > Run a command."
Write-Host "Command: $VenvPython"
Write-Host "Argument: $(Join-Path $AgentDir 'server.py')"
Write-Host "Environment: OMB_AGENT_ALLOWED_ROOTS=$WorkspaceRoot"
