param(
    [Parameter(Mandatory)]
    [ValidateSet('bombona', 'slime')]
    [string]$Site,
    [Parameter(Mandatory)]
    [string]$SourceDir,
    [string]$Tag = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

$ErrorActionPreference = 'Stop'

function Assert-Native([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)" }
}

$gcloudFallback = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'
$gcloudCommand = (Get-Command gcloud -ErrorAction SilentlyContinue).Source
if (-not $gcloudCommand -and (Test-Path -LiteralPath $gcloudFallback)) { $gcloudCommand = $gcloudFallback }
if (-not $gcloudCommand) { throw 'gcloud is not installed or could not be found.' }
$containerCommand = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (-not $containerCommand) { throw 'docker is not installed or could not be found.' }
$kubectlCommand = (Get-Command kubectl -ErrorAction SilentlyContinue).Source
if (-not $kubectlCommand) { throw 'kubectl is not installed or could not be found.' }

$resolvedSource = (Resolve-Path -LiteralPath $SourceDir).Path
$distPath = Join-Path $resolvedSource 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $distPath 'index.html'))) {
    throw "No se encontró dist/index.html en $resolvedSource"
}

Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $registry = 'southamerica-east1-docker.pkg.dev'
    $image = "$registry/gen-lang-client-0331944990/kaido-group/${Site}:$Tag"
    $dockerfile = Join-Path (Get-Location) 'static-sites/Dockerfile'

    & $containerCommand build --platform linux/amd64 -f $dockerfile -t $image $distPath
    Assert-Native 'Image build'

    $token = & $gcloudCommand auth print-access-token
    Assert-Native 'Google authentication'
    $token | & $containerCommand login -u oauth2accesstoken --password-stdin $registry
    Assert-Native 'Registry login'

    $auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('oauth2accesstoken:' + $token))
    $config = @{ auths = @{ $registry = @{ auth = $auth } } } | ConvertTo-Json -Depth 6 -Compress
    $secret = @{
        apiVersion = 'v1'; kind = 'Secret'
        metadata = @{ name = 'artifact-registry'; namespace = 'andrusdiaz' }
        type = 'kubernetes.io/dockerconfigjson'
        data = @{ '.dockerconfigjson' = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($config)) }
    }
    $secret | ConvertTo-Json -Depth 8 -Compress | & $kubectlCommand --context linko-netcup apply --server-side -f -
    Assert-Native 'Registry pull token'
    $token = $null
    $auth = $null; $config = $null; $secret = $null

    & $containerCommand push $image
    Assert-Native 'Image push'

    $manifest = Join-Path (Get-Location) 'k8s/kustomization.yaml'
    $content = [IO.File]::ReadAllText($manifest)
    $pattern = "(?m)(  - name: $Site\r?\n    newName: [^\r\n]+\r?\n    newTag: )[^\r\n]+"
    $match = [regex]::Match($content, $pattern)
    if (-not $match.Success) { throw "No se encontró la imagen de $Site en k8s/kustomization.yaml" }
    $updated = [regex]::Replace($content, $pattern, "`${1}$Tag")
    if ($updated -ne $content) { [IO.File]::WriteAllText($manifest, $updated) }

    & $kubectlCommand --context linko-netcup apply --dry-run=server -k k8s
    Assert-Native 'Manifest validation'
    & $kubectlCommand --context linko-netcup apply -k k8s
    Assert-Native 'Deployment'
    & $kubectlCommand --context linko-netcup -n andrusdiaz rollout status "deployment/$Site" --timeout=180s
    Assert-Native 'Rollout'
} finally {
    Pop-Location
}
