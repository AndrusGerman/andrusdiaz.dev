# CI/CD de `andrusdiaz.dev`

El workflow [`build-and-deploy.yml`](../.github/workflows/build-and-deploy.yml)
se ejecuta al cambiar código, assets o configuración de despliegue en `main`.
También admite `workflow_dispatch`. Valida con `npm ci`, `npm run check` y
`npm run build`, y publica la imagen `linux/amd64` directamente en:

```text
southamerica-east1-docker.pkg.dev/gen-lang-client-0331944990/kaido-group/andrusdiaz:<github.sha>
```

El digest publicado se confirma automáticamente en
[`k8s/kaido/kustomization.yaml`](../k8s/kaido/kustomization.yaml). El commit
lleva `[skip ci]` para evitar otro build. CI comprueba que su destino coincide
con el de Kustomize antes de actualizarlo.

`GitRepository/andrusdiaz-home` y `Kustomization/andrusdiaz-home`, definidos en
[`kaido-group-flux.patch.yaml`](./kaido-group-flux.patch.yaml) y publicados en
el repositorio central `AndrusGerman/kaido-group`, observan `main` y aplican
`./k8s/kaido` al namespace `andrusdiaz`. Flux espera el rollout con `wait: true`
y conserva `prune: false`. La credencial `artifact-registry` ya existente en
ese namespace permite descargar desde `kaido-group`; no hace falta promoción
manual entre registros.

## WIF y permiso de publicación

- Proveedor existente: `projects/174766353053/locations/global/workloadIdentityPools/github-actions/providers/github-kaido`.
- Identidad CI existente: `kaido-admin-builder@gen-lang-client-0331944990.iam.gserviceaccount.com`.
- Recurso de Artifact Registry: `projects/gen-lang-client-0331944990/locations/southamerica-east1/repositories/kaido-group`.
- Permiso de publicación: `roles/artifactregistry.writer` sobre ese repositorio, autorizado el 2026-10-16. Se conservan los permisos anteriores.

WIF ya autoriza al repositorio `AndrusGerman/andrusdiaz.dev` a usar esa cuenta.
GitHub sólo publica imágenes y confirma el digest en Git: no necesita kubeconfig,
acceso al API privado, claves JSON ni nuevos secretos. Flux despliega desde
el clúster con las credenciales de lectura existentes.
