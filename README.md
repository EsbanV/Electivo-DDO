# Saldo Claro

Maqueta web para presentar una aplicación de finanzas personales para estudiantes universitarios: muestra saldos, cuentas por pagar y gastos rápidos. Es solo front-end: no hay servidor, base de datos ni inicio de sesión real. Todos los datos son de ejemplo y se guardan solo en memoria (al recargar la página vuelven a su valor inicial).

## Tecnologías

React + TypeScript + Vite.

## Cómo ejecutarla

```powershell
npm install
npm run dev
```

- [http://localhost:5173/](http://localhost:5173/): resumen (saldos, cuentas, gastos).
- [http://localhost:5173/auth/](http://localhost:5173/auth/): pantalla de acceso. El formulario no valida nada: cualquier dato lleva al resumen.

Otros comandos: `npm run build` (genera `dist/`) y `npm run lint`.

## Cómo leer el código

1. `index.html` y `src/main.tsx`: entrada del resumen.
2. `src/App.tsx`: página del resumen; guarda el estado y arma los paneles.
3. `src/components/`: un archivo por panel (saldo, cuentas, guía diaria, gasto rápido, resumen de gastos).
4. `src/data.ts`: tipos, formato de montos y fechas, y los datos de ejemplo.
5. `auth/index.html`, `src/auth-main.tsx` y `src/pages/AuthPage.tsx`: pantalla de acceso.
