# Datos de Cuentas Claras

Archivos públicos con el **dólar** (oficial, blue y MEP), el **IPC** y el **ICL** que usa la app de Cuentas Claras.
Se actualizan solos todos los días con GitHub Actions y se publican con GitHub Pages.

Son datos públicos, tomados de:

- Dólar e IPC: [ArgentinaDatos](https://argentinadatos.com) (replica datos del INDEC y de casas de cambio).
- ICL (Índice para Contratos de Locación): [API de estadísticas del BCRA](https://www.bcra.gob.ar/).
- IPC oficial de respaldo: INDEC, a través de [datos.gob.ar](https://datos.gob.ar).

## Cómo ponerlo en marcha (una sola vez)

1. Crear un repositorio **público** en GitHub, por ejemplo `cuentas-claras-datos`, y subir el contenido de esta carpeta.
2. En el repositorio: **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, carpeta `/docs`.
3. En **Actions**, ejecutar a mano *Actualizar datos* una vez para comprobar que funciona.
4. La dirección pública queda así: `https://TU-USUARIO.github.io/cuentas-claras-datos`.
5. En la app, poner esa dirección en `lib/core/data_config.dart` (`dataBaseUrl`). La app la prueba primero y, si
   no responde, usa las APIs originales y, en última instancia, la copia que trae dentro.

## Qué garantiza

- Antes de escribir un archivo se validan cantidad de datos, rangos razonables y que el último dato sea reciente.
  Si algo no cierra, **no se pisa el archivo anterior** y el trabajo avisa en rojo.
- Formato compacto: lo leen exactamente igual la app y `tool/update_snapshots.mjs`.

Para actualizar a mano en la computadora: `node tool/update_snapshots.mjs docs`.
