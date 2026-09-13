# andrusdiaz.dev en Kubernetes

Web estática Astro servida por nginx sin privilegios en el clúster `linko-netcup`.

- URL principal: `https://andrusdiaz.dev`.
- Namespace: `andrusdiaz`.
- Deployment, Service, Ingress y ServiceAccount: `andrusdiaz-home`.
- Imagen: `southamerica-east1-docker.pkg.dev/gen-lang-client-0331944990/kaido-group/andrusdiaz:<tag>`.
- Un pod con requests de 10m CPU / 16Mi RAM y límites de 100m / 64Mi.
- Ingress Traefik y certificado mediante el ClusterIssuer existente.
- El Ingress solo reclama el host raíz; `bombona.andrusdiaz.dev`, `slime.andrusdiaz.dev` y futuros subdominios pueden usar despliegues e Ingress independientes.

## Compilar y desplegar

Desde PowerShell con Docker, gcloud y kubectl autenticados:

```powershell
./scripts/build-deploy.ps1
```

El script compila Astro dentro de una imagen multietapa, publica una etiqueta única en Artifact Registry, renueva el secreto de descarga, actualiza `kustomization.yaml`, valida los manifiestos y espera el rollout.

```powershell
./scripts/build-deploy.ps1 -BuildOnly
kubectl --context linko-netcup apply -k k8s
kubectl --context linko-netcup -n andrusdiaz get pods,ingress,certificate
```

El secreto `artifact-registry` usa un token OAuth temporal del usuario activo de gcloud. No se guardan credenciales en Git. Si el clúster necesita descargar nuevamente la imagen tras expirar el token, hay que ejecutar el script de despliegue para renovarlo.

## Juegos en subdominios

Los juegos se construyen desde su carpeta `dist/` sin mezclar su código fuente con la home:

```powershell
./scripts/deploy-static-site.ps1 -Site bombona -SourceDir 'C:\ruta\a\bombona-game'
./scripts/deploy-static-site.ps1 -Site slime -SourceDir 'C:\ruta\a\rpg-slime'
```

Cada uno se publica en una imagen independiente y conserva el mismo namespace: `bombona.andrusdiaz.dev` y `slime.andrusdiaz.dev`.
