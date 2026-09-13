# andrusdiaz.dev

Página personal de Andrus Díaz construida con Astro. Es un archivo visual de productos, infraestructura, observabilidad, código abierto y juegos creados o impulsados por Andrus.

## Desarrollo

```powershell
npm ci
npm run dev
npm run build
```

## Publicación

```powershell
./scripts/build-deploy.ps1
```

La imagen se publica como `southamerica-east1-docker.pkg.dev/gen-lang-client-0331944990/kaido-group/andrusdiaz:<tag>` y la home se despliega en el namespace Kubernetes `andrusdiaz` para `https://andrusdiaz.dev`.

Los subdominios de proyectos se mantienen separados de la home. Los primeros previstos son:

- `bombona.andrusdiaz.dev`
- `slime.andrusdiaz.dev`

Detalles de infraestructura y autenticación: [k8s/README.md](k8s/README.md).

## Medios

Las capturas de Bombona Club, Crónicas del Slime y Planning Poker provienen de sus versiones públicas. El panel de observabilidad es un visual genérico, sin datos reales ni marcas, creado para representar el trabajo realizado con Grafana y Cloud Trace.
