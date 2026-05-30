# RSC Remada — Deploy en Vercel

App de seguimiento de tiempos de remada 100m para Rosario Surf Club.

## Deploy (5 minutos, gratis)

### 1. Subir el código a GitHub

1. Creá una cuenta en [github.com](https://github.com) si no tenés
2. Creá un nuevo repositorio (New repository) → nombre: `rsc-remada` → Create
3. Subí todos los archivos de esta carpeta al repositorio
   - Opción fácil: arrastrá los archivos al repositorio desde el navegador
   - O desde terminal:
     ```bash
     git init
     git add .
     git commit -m "first commit"
     git remote add origin https://github.com/TU_USUARIO/rsc-remada.git
     git push -u origin main
     ```

### 2. Deploy en Vercel

1. Entrá a [vercel.com](https://vercel.com) → Sign up con tu cuenta de GitHub
2. Click en **Add New Project**
3. Seleccioná el repositorio `rsc-remada`
4. Click **Deploy** (sin cambiar nada)

### 3. Conectar la base de datos (Vercel KV)

1. En el dashboard de tu proyecto en Vercel, ir a **Storage**
2. Click **Create Database** → elegí **KV** (Redis)
3. Nombralo `rsc-remada-kv` → Create
4. Click **Connect to Project** → seleccioná tu proyecto → Connect
5. Redeploy el proyecto (Deployments → tres puntos → Redeploy)

¡Listo! La app va a estar disponible en `https://rsc-remada.vercel.app` (o similar).

Los datos se guardan en la nube y son accesibles desde cualquier dispositivo.
La primera vez que se abra, carga automáticamente todos los surfers y tiempos históricos.

## Uso

- **Tabla**: ver todos los tiempos históricos. Tocar una celda para editar.
- **Sesión**: carga rápida de tiempos del día. Seleccioná la sesión activa arriba.
- **Ranking**: ranking general por mejor tiempo histórico (★ MT = Mejor Tiempo Personal).

## Agregar sesiones o surfers

Botones **+ Sesión** y **+ Surfer** en el header.
