# Publicar GRUFI SOLUCIONES en Vercel

El proyecto ya está listo para desplegar:

- Compila sin errores (`npm run typecheck`, `npm run lint`, `npm run build`).
- Repositorio git inicializado con un primer commit.
- `.env.local` (con tus credenciales) está en `.gitignore`: **no** se sube a ningún lado.
- Supabase ya tiene las tablas, las políticas RLS y tu usuario.

Falta un paso que **solo tú puedes hacer** porque requiere iniciar sesión en
Vercel con tu cuenta. Elige UNA de las dos formas.

---

## Opción A — Vercel CLI (más rápida, sin GitHub)

En la terminal, dentro de la carpeta del proyecto:

```bash
npm i -g vercel
vercel login
```

(Se abre el navegador para confirmar tu cuenta.)

```bash
vercel --prod
```

Responde:

- **Set up and deploy?** → `y`
- **Which scope?** → tu cuenta (`pato-mon1`)
- **Link to existing project?** → `n`
- **Project name?** → `grufi-soluciones` (Enter)
- **In which directory is your code?** → `./` (Enter)
- **Modify settings?** → `n`

Al terminar te da la URL pública (algo como `https://grufi-soluciones.vercel.app`).

Ahora agrega las variables de entorno y vuelve a desplegar:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

Pega el valor de `NEXT_PUBLIC_SUPABASE_URL` que tienes en tu `.env.local`.

```bash
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
```

Pega tu clave `sb_publishable_...` (la misma de `.env.local`).

```bash
vercel --prod
```

Listo. Esa URL abre desde cualquier teléfono o computadora.

---

## Opción B — GitHub + panel de Vercel

1. Crea un repositorio nuevo (privado) en <https://github.com/new>, por ejemplo
   `grufi-soluciones`. **No** agregues README ni .gitignore.
2. Conéctalo y sube el código:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/grufi-soluciones.git
   git branch -M main
   git push -u origin main
   ```

3. Entra a <https://vercel.com/new>, importa ese repositorio (Vercel detecta
   Next.js solo).
4. Antes de pulsar **Deploy**, abre **Environment Variables** y agrega:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | el valor de tu `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | el valor de tu `.env.local` |

   (Ambos están en `.env.local`, que no se sube al repositorio. También puedes
   copiarlos desde Supabase → Project Settings → API.)

5. **Deploy.** Te da la URL pública. Cada `git push` posterior vuelve a desplegar
   automáticamente.

---

## Después del despliegue

- En Supabase → **Authentication → URL Configuration**, pon la URL de Vercel en
  **Site URL**.
- Abre la URL en el teléfono: te lleva a `/login`, entras con tu correo y
  contraseña, y ves el dashboard con la etiqueta **"Nube"**.
- Los datos ya migrados (12 empresas, sus contactos) aparecen igual, porque
  viven en Supabase, no en el navegador.
