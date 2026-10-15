# CI/CD de `andrusdiaz.dev`

El workflow [`build-and-deploy.yml`](../.github/workflows/build-and-deploy.yml)
se ejecuta en `main` del repositorio `AndrusGerman/andrusdiaz.dev`. Primero
ejecuta `npm ci`, `npm run check` y `npm run build`; después construye y publica
la imagen `linux/amd64` en:

```text
southamerica-east1-docker.pkg.dev/gen-lang-client-0331944990/kaido-group/andrusdiaz:<github.sha>
```

El digest que devuelve Artifact Registry se escribe en
[`k8s/kaido/kustomization.yaml`](../k8s/kaido/kustomization.yaml). Flux debe
seguir esa ruta y la rama `main` mediante los recursos del parche
[`kaido-group-flux.patch.yaml`](./kaido-group-flux.patch.yaml). El commit
automático lleva `[skip ci]` para evitar un segundo build.

## Requisito de WIF/IAM

El workflow usa estos identificadores, que no son secretos:

- Proveedor: `projects/174766353053/locations/global/workloadIdentityPools/github-actions/providers/github-kaido`
- Cuenta de servicio: `kaido-admin-builder@gen-lang-client-0331944990.iam.gserviceaccount.com`
- Repositorio de Artifact Registry: `projects/gen-lang-client-0331944990/locations/southamerica-east1/repositories/kaido-group`

El proveedor `github-kaido` existente sólo permite actualmente
`AndrusGerman/kaido-group`, que conserva su workflow de administración. Antes
de activar este workflow, hay que extender la condición del proveedor sin
quitar ese acceso existente. La condición resultante debe ser:

```text
assertion.repository_owner == 'AndrusGerman' && (
  assertion.repository == 'AndrusGerman/kaido-group' ||
  (assertion.repository == 'AndrusGerman/andrusdiaz.dev' &&
   assertion.ref == 'refs/heads/main')
)
```

La cuenta necesita también un binding `roles/iam.workloadIdentityUser` para el
principal del repositorio (`attribute.repository=AndrusGerman/andrusdiaz.dev`)
y `roles/artifactregistry.writer` únicamente sobre el repositorio regional
`kaido-group`. Conserva el binding equivalente de `AndrusGerman/kaido-group`.
No se deben crear claves JSON, guardar secretos de Google en GitHub ni conceder
permisos de Kubernetes al runner. Esta configuración IAM se debe aplicar en
Google Cloud o en el repositorio de infraestructura; este repo solo declara el
proveedor y la cuenta que usará `google-github-actions/auth@v3`.
