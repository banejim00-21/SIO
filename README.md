This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## ----------------------------------------------------------------------------------CREAR BUCKET DE DOCMUENTOS 

# Configuración de Supabase Storage para SIO

## 1. Crear el Bucket en Supabase

1. Ve a tu panel de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Storage** en el menú lateral
4. Click en **New bucket**
5. Nombre del bucket: `documentos`
6. Marca la opción **Public bucket** (para que los archivos sean accesibles)
7. Click en **Create bucket**

## 2. Configurar Políticas de Acceso (RLS)

En la sección de Storage, click en tu bucket `documentos`, luego en **Policies**:

### Política para SUBIR archivos (INSERT):
```sql
CREATE POLICY "Usuarios autenticados pueden subir"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');
```

### Política para VER archivos (SELECT):
```sql
CREATE POLICY "Archivos públicos pueden verse"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documentos');
```

### Política para ELIMINAR archivos (DELETE):
```sql
CREATE POLICY "Admins pueden eliminar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');
```

## 3. Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

El `SUPABASE_SERVICE_ROLE_KEY` lo encuentras en:
- Supabase Dashboard → Settings → API → Service Role Key (secreto)

## 4. Alternativa: Usar Políticas Simples

Si quieres una configuración más simple para desarrollo, puedes hacer el bucket completamente público:

1. Ve a Storage → documentos → Policies
2. Click en "New Policy"
3. Selecciona "For full customization"
4. Nombre: "Allow all"
5. Allowed operations: SELECT, INSERT, UPDATE, DELETE
6. Target roles: public
7. Policy: `true`

⚠️ **NOTA:** Esta configuración es solo para desarrollo. En producción, usa políticas más restrictivas.

## 5. Estructura de Carpetas

Los archivos se guardarán así:
```
documentos/
├── obras/
│   ├── 1/
│   │   ├── archivo1.pdf
│   │   └── archivo2.jpg
│   ├── 2/
│   │   └── archivo.pdf
```

## 6. Verificar que funciona

1. Sube un archivo desde la interfaz de Obras
2. Revisa en Supabase Storage que el archivo aparezca
3. Verifica que la URL pública funcione

## Troubleshooting

### Error: "new row violates row-level security"
- Ve a Storage → Policies y verifica que las políticas estén activas

### Error: "Bucket not found"
- Asegúrate de que el bucket se llame exactamente `documentos`

### Error: "Invalid API Key"
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté correctamente configurado
- Reinicia el servidor de desarrollo después de cambiar variables de entorno
##------------------------------------------------------------------------------------------------------------------------