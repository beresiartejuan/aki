# 🛠️ Herramientas del Agente Aki

Este directorio contiene las herramientas que el agente Aki puede usar para interactuar con el sistema de archivos y ejecutar comandos en el entorno de trabajo.

## 📁 Estructura

```
tools/
├── definitions.ts    # Definiciones de herramientas para Ollama
├── executor.ts       # Ejecutor de llamadas a herramientas
├── filesystem.ts     # Operaciones de sistema de archivos
├── sandbox.ts        # Validaciones de seguridad y sandboxing
├── security.ts       # Patrones de seguridad y validaciones
├── shell.ts          # Ejecución segura de comandos
└── __tests__/        # Pruebas unitarias
```

## 🔒 Seguridad

Todas las herramientas implementan medidas de seguridad robustas:

### Sandbox de Archivos
- Todas las operaciones de archivo están restringidas al directorio `WORKSPACE_ROOT`
- Validación automática de rutas para prevenir acceso a ubicaciones sensibles
- Límites de tamaño para archivos y directorios

### Ejecución de Comandos Segura
- Lista de comandos bloqueados (rm -rf /, sudo, chmod 777, etc.)
- Timeout automático de 15 segundos para comandos
- Límites de output para prevenir overflow

## 🧰 Herramientas Disponibles

### Sistema de Archivos
- `read_file` - Leer contenido de archivos
- `write_file` - Escribir contenido en archivos
- `list_directory` - Listar contenido de directorios
- `create_directory` - Crear directorios
- `delete_file` - Eliminar archivos
- `delete_directory` - Eliminar directorios
- `move_file` - Mover/renombrar archivos y directorios
- `search_files` - Buscar archivos por patrón

### Shell
- `run_command` - Ejecutar comandos en el entorno de trabajo

## 🧪 Pruebas

Las herramientas están completamente testeadas con Vitest:

```bash
# Ejecutar todas las pruebas
pnpm test

# Ejecutar pruebas en modo watch
pnpm test:watch

# Ejecutar pruebas con interfaz gráfica
pnpm test:ui
```

## ⚙️ Configuración

La herramientas usan la variable de entorno `WORKSPACE_ROOT` para determinar el directorio de trabajo seguro. Por defecto es `./workspace`.