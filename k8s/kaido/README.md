# andrusdiaz.dev en Kaido

Este directorio contiene el estado deseado de la web principal de `andrusdiaz.dev` para el clúster Kaido. Flux lo aplica desde el repositorio público en la rama `main`, usando la Kustomization registrada en el repositorio central `kaido-group`.

El workflow `.github/workflows/build-and-deploy.yml` valida Astro, publica la imagen en Artifact Registry y actualiza este archivo con el digest inmutable que Flux debe reconciliar. La federación WIF debe autorizar el repositorio antes de que el job de publicación pueda autenticarse.

`kustomization.yaml` crea el namespace, ServiceAccounts, Deployment y Service. No se usa Ingress ni Traefik. Cloudflare Tunnel `kaido-k3s` conecta el servicio `andrusdiaz-home` dentro del namespace `andrusdiaz`.

El recurso `GitRepository` y la `Kustomization` de Flux están preparados en `docs/kaido-group-flux.patch.yaml` para aplicarlos al repositorio central después de resolver su divergencia local.

## Bombona y Slime

`games.yaml` define los Deployments y Services `bombona` y `slime`, ambos en el namespace `andrusdiaz`. Cloudflare Tunnel `kaido-k3s` usa sus Services privados dentro del mismo namespace.
