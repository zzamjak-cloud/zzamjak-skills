#requires -Version 7.0

[CmdletBinding()]
param(
    [switch]$CodexOnly,
    [switch]$ClaudeOnly,
    [switch]$BackupExisting,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($CodexOnly -and $ClaudeOnly) {
    throw "CodexOnly와 ClaudeOnly를 함께 사용할 수 없습니다."
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$SkillsRoot = Join-Path $RepoRoot "skills"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Targets = @()

if (-not $ClaudeOnly) {
    $CodexSkillsRoot = if ($env:CODEX_SKILLS_DIR) { $env:CODEX_SKILLS_DIR } else { Join-Path $HOME ".agents/skills" }
    $Targets += $CodexSkillsRoot
}

if (-not $CodexOnly) {
    $ClaudeConfigRoot = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
    $Targets += Join-Path $ClaudeConfigRoot "skills"
}

$SkillFiles = Get-ChildItem -Path $SkillsRoot -Filter "SKILL.md" -File -Recurse |
    Where-Object {
        $RelativeParts = $_.FullName.Substring($SkillsRoot.Length).TrimStart([IO.Path]::DirectorySeparatorChar).Split([IO.Path]::DirectorySeparatorChar)
        $RelativeParts.Count -eq 3
    } |
    Sort-Object FullName

if (-not $SkillFiles) {
    throw "등록된 스킬이 없습니다."
}

$DuplicateNames = $SkillFiles.Directory.Name | Group-Object | Where-Object Count -gt 1
if ($DuplicateNames) {
    throw "저장소 전체에서 중복된 스킬 이름이 있습니다: $($DuplicateNames.Name -join ', ')"
}

foreach ($TargetRoot in $Targets) {
    foreach ($SkillFile in $SkillFiles) {
        $SkillDirectory = $SkillFile.Directory.FullName
        $SkillName = $SkillFile.Directory.Name
        $Target = Join-Path $TargetRoot $SkillName

        if (Test-Path -LiteralPath $Target) {
            $TargetItem = Get-Item -LiteralPath $Target -Force
            if ($TargetItem.LinkType -and $TargetItem.Target -eq $SkillDirectory) {
                Write-Host "유지: $Target"
                continue
            }

            if (-not $BackupExisting) {
                throw "기존 항목을 덮어쓰지 않습니다: $Target. 계속하려면 -BackupExisting을 사용하세요."
            }

            $BackupRoot = Join-Path $TargetRoot ".skill-backups/$Timestamp"
            $BackupTarget = Join-Path $BackupRoot $SkillName
            if ($DryRun) {
                Write-Host "백업 예정: $Target -> $BackupTarget"
            } else {
                New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
                Move-Item -LiteralPath $Target -Destination $BackupTarget
                Write-Host "백업: $BackupTarget"
            }
        }

        if ($DryRun) {
            Write-Host "연결 예정: $Target -> $SkillDirectory"
        } else {
            New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
            New-Item -ItemType Junction -Path $Target -Target $SkillDirectory | Out-Null
            Write-Host "연결: $Target -> $SkillDirectory"
        }
    }
}
