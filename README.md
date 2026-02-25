# Verificador SIMs CLARO

App para escanear chips SIM con IA y validar su estado contra la base de datos de Claro.

## Cómo deployar en Vercel (paso a paso)

### 1. Obtener API Key de Google Gemini (GRATIS)
1. Entrá a https://aistudio.google.com/app/apikey
2. Iniciá sesión con tu cuenta de Google
3. Hacé clic en "Create API Key"
4. Copiá la clave generada

### 2. Subir el proyecto a GitHub
1. Creá un repositorio nuevo en github.com (puede ser privado)
2. Subí todos estos archivos al repositorio

### 3. Deployar en Vercel
1. Entrá a vercel.com con tu cuenta
2. Hacé clic en "Add New Project"
3. Importá el repositorio de GitHub
4. En la sección **Environment Variables**, agregá:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** (pegá tu API Key de Google)
5. Hacé clic en "Deploy"
6. ¡Listo! En 2 minutos tenés la URL de tu app

### 4. Actualizar la base de datos
Cuando tengas una nueva planilla de SIMs:
1. Corré el script: `node scripts/updateDb.js nueva_planilla.xlsx`
2. Commiteá los cambios a GitHub
3. Vercel re-deploya automáticamente

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Editá .env.local y poné tu GEMINI_API_KEY
npm run dev
```

Abrí http://localhost:3000

## Costo
- Google Gemini 1.5 Flash: **GRATIS** hasta 1500 requests/día
- Vercel: **GRATIS** para proyectos personales
