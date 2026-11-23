# Saldo Claro

Aplicación web para estudiantes universitarios que quieren distinguir sus saldos del dinero que ya tiene destino. La información se ingresa manualmente; la app no se conecta a bancos ni guarda números de tarjetas o credenciales bancarias.

## Tecnologías

- **React + TypeScript + Vite:** interfaz multipágina.
- **Vercel Functions:** endpoints del servidor en `api/`.
- **Supabase Auth + PostgreSQL:** acceso y persistencia con políticas RLS.
- **Docker Compose:** entorno de desarrollo local con API integrada.

## Desarrollo local

El entorno local usa Supabase Auth y PostgreSQL en Docker. Al iniciar el stack, la CLI aplica la migración versionada `supabase/migrations/202611080001_initial_schema.sql`.

1. Abre Docker Desktop.
2. En la raíz del repositorio ejecuta:

   ```powershell
   npm install
   npm run supabase:start
   npm run supabase:env
   docker compose up -d
   ```

3. Abre [http://localhost:5173/auth/](http://localhost:5173/auth/) para crear una cuenta e iniciar sesión. La confirmación de correo está desactivada en la instancia local.

`supabase:env` escribe `.env.local` con la URL y la clave local, sin copiar la clave secreta que muestra la CLI. Ajusta por separado las variables de Preview y Production en Vercel para conectar el proyecto remoto.

El servidor Vite ejecuta las mismas funciones de `api/` que se publican en Vercel. La ruta `http://localhost:5173/api/health` informa si la API está activa. No hay modo de inicio de sesión simulado ni almacenamiento de datos de prueba.

Comandos útiles:

- `npm run supabase:status`: consulta URLs y estado de los servicios locales.
- `npm run supabase:stop`: detiene Supabase local; conserva la base local.
- `npm run supabase:reset`: borra y reconstruye **la base local**, aplicando las migraciones. No usar para restablecer una base remota.

## Demo

La ruta [http://localhost:5173/demo/](http://localhost:5173/demo/) muestra una versión de muestra con datos ficticios, sin cuenta ni conexión a Supabase. Los cambios que se hacen en ella viven solo en la memoria del navegador y se pierden al recargar. Se llega desde el enlace "Ver demo" de la pantalla de acceso.

El demo está separado de la app real:

- `demo/index.html`: define la ruta `/demo/`.
- `src/demo/`: `main.tsx` (punto de entrada), `DemoPage.tsx` (página y datos ficticios) y `DemoPage.css`.
- Reutiliza solo los componentes de pantalla de `src/components/` y los tipos de `src/data.ts`; no usa `api/` ni `src/lib/supabase.ts`.

## Cómo leer el código

1. `supabase/migrations/`: tablas y reglas de la base de datos (`docs/modelo-base-datos.md` lo explica).
2. `api/`: un archivo por recurso; `api/_lib/http.ts` verifica la sesión y valida entradas.
3. `src/lib/budget-api.ts`: funciones que llaman a la API desde el navegador.
4. `src/App.tsx` y `src/components/`: pantalla principal y sus paneles.
5. `src/pages/AuthPage.tsx`: acceso y registro.

## Variables de entorno

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: inicializan Supabase Auth en el navegador.
- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`: conectan las funciones del servidor a Supabase. En Docker local, la URL del servidor usa `host.docker.internal` para alcanzar el stack del host.

Las claves publicables pueden usarse en el navegador; las políticas RLS limitan las operaciones a los datos del usuario autenticado. No configures claves `secret` o `service_role` en el navegador ni en este proyecto.

## API

Todas las rutas de datos exigen una sesión Supabase válida en `Authorization: Bearer <access_token>`. La identidad se obtiene del token verificado, no de un ID de usuario enviado por la interfaz.

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Cargar fuentes, saldos, cuentas, categorías, atajos y gastos del mes actual. |
| `POST` | `/api/sources` | Crear cuenta o beneficio con saldo inicial. |
| `POST` | `/api/balances` | Guardar una actualización de saldo. |
| `POST` | `/api/expenses` | Registrar un gasto rápido. |
| `POST` | `/api/bills` | Crear una cuenta puntual o mensual. |
| `PATCH` | `/api/bills` | Marcar una cuenta como pagada o pendiente (`billId` en el cuerpo). |
| `GET` | `/api/health` | Comprobar que la API local responde. |

Cada endpoint valida lo que envía el usuario, verifica la sesión y usa un cliente Supabase con el token del usuario, así las políticas RLS de la base limitan los datos a su dueño.


## Aplicar migraciones al proyecto remoto

La carpeta `supabase/migrations` es la fuente de verdad para la base local y la remota. Para preparar el proyecto remoto con el mismo historial:

1. Ejecuta `npx supabase login` y autentícate.
2. Enlaza este repositorio con tu proyecto usando `npx supabase link --project-ref TU_PROJECT_REF` (el identificador está en la URL del proyecto Supabase).
3. Ejecuta `npm run supabase:push:remote` para aplicar las migraciones pendientes.
4. Configura las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en Vercel Preview y Production; en remoto, las dos URL usan la Project URL.

Si ya ejecutaste la migración manualmente desde el SQL Editor remoto, no la vuelvas a aplicar a ciegas: el historial de migraciones puede requerir sincronización antes de usar `db push`. Vercel detecta las funciones en `api/` en proyectos Vite. [Documentación de Vercel](https://vercel.com/docs/frameworks/frontend/vite)
