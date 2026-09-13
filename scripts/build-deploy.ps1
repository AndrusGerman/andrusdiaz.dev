param(
    [string]$Tag = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [switch]$BuildOnly
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
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $registry = 'southamerica-east1-docker.pkg.dev'
    $image = "$registry/gen-lang-client-0331944990/kaido-group/andrusdiaz:$Tag"
    & $containerCommand build --platform linux/amd64 -t $image .
    Assert-Native 'Image build'
    if ($BuildOnly) { return }
    $token = & $gcloudCommand auth print-access-token
    Assert-Native 'Google authentication'
    $token | & $containerCommand login -u oauth2accesstoken --password-stdin $registry
    Assert-Native 'Registry login'
    & $kubectlCommand --context linko-netcup apply -f k8s/namespace.yaml
    Assert-Native 'Namespace'
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
    $content = $content -replace '(?m)^    newTag: .*$', "    newTag: $Tag"
    [IO.File]::WriteAllText($manifest, $content)
    & $kubectlCommand --context linko-netcup apply --dry-run=server -k k8s
    Assert-Native 'Manifest validation'
    & $kubectlCommand --context linko-netcup apply -k k8s
    Assert-Native 'Deployment'
    & $kubectlCommand --context linko-netcup -n andrusdiaz rollout status deployment/andrusdiaz-home --timeout=180s
    Assert-Native 'Rollout'
} finally {
    Pop-Location
}
